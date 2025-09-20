import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Constants "./Constants";
import Nat64 "mo:base/Nat64";

actor {
  // Token type
  public type Token = {
    symbol : Text;
    name : Text;
    decimals : Nat;
    total_supply : Nat;
  };

  // Balance record
  public type Balance = {
    user : Principal;
    token : Text;
    amount : Nat;
    last_updated : Int;
  };

  // Transaction record
  public type Transaction = {
    id : Nat;
    from : Principal;
    to : Principal;
    token : Text;
    amount : Nat;
    timestamp : Int;
    tx_type : Text; // "transfer", "mint", "burn", "stake", "unstake"
  };

  // Stable storage
  stable var balancesArr : [Balance] = [];
  stable var transactionsArr : [Transaction] = [];
  stable var nextTransactionId : Nat = 1;
  stable var allowancesArr : [(Principal, Principal, Text, Nat)] = [];

  // Non-stable HashMaps for fast lookup
  var balances : HashMap.HashMap<Principal, HashMap.HashMap<Text, Nat>> = HashMap.HashMap<Principal, HashMap.HashMap<Text, Nat>>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
  var transactions : HashMap.HashMap<Principal, [Transaction]> = HashMap.HashMap<Principal, [Transaction]>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
  var allowances : HashMap.HashMap<Principal, HashMap.HashMap<Principal, HashMap.HashMap<Text, Nat>>> = HashMap.HashMap<Principal, HashMap.HashMap<Principal, HashMap.HashMap<Text, Nat>>>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });

  // Supported tokens
  let supportedTokens : [Token] = [
    { symbol = "SPICY"; name = "Spicy Token"; decimals = 8; total_supply = 1_000_000_000_000_000_000 }, // 1 billion SPICY
    { symbol = "HEAT"; name = "Heat Token"; decimals = 8; total_supply = 100_000_000_000_000_000 }, // 100 million HEAT
  ];

  // Register a user wallet: create zero balances for all supported tokens
  public shared ({ caller }) func registerUser() : async Bool {
    switch (balances.get(caller)) {
      case (?_) { true }; // already registered
      case null {
        let userBalances = HashMap.HashMap<Text, Nat>(10, Text.equal, func(t : Text) : Nat32 { 0 });
        for (t in supportedTokens.vals()) {
          userBalances.put(t.symbol, 0);
        };
        balances.put(caller, userBalances);
        true
      };
    }
  };

  public shared query func isRegistered(user : Principal) : async Bool {
    switch (balances.get(user)) { case null { false }; case (?_) { true } };
  };

  // Approve spender to transfer owner's tokens
  public shared ({ caller }) func approve(spender : Principal, token : Text, amount : Nat) : async Bool {
    let owner = caller;
    let ownerMap = switch (allowances.get(owner)) {
      case null {
        let m = HashMap.HashMap<Principal, HashMap.HashMap<Text, Nat>>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
        allowances.put(owner, m);
        m
      };
      case (?m) m;
    };
    let spenderMap = switch (ownerMap.get(spender)) {
      case null {
        let m = HashMap.HashMap<Text, Nat>(10, Text.equal, func(t : Text) : Nat32 { 0 });
        ownerMap.put(spender, m);
        m
      };
      case (?m) m;
    };
    spenderMap.put(token, amount);
    ownerMap.put(spender, spenderMap);
    allowances.put(owner, ownerMap);
    true
  };

  // Query allowance
  public shared query func allowance(owner : Principal, spender : Principal, token : Text) : async Nat {
    switch (allowances.get(owner)) {
      case null 0;
      case (?ownerMap) {
        switch (ownerMap.get(spender)) {
          case null 0;
          case (?spenderMap) { switch (spenderMap.get(token)) { case null 0; case (?a) a } };
        }
      };
    }
  };

  // Transfer tokens on behalf of owner (spender must be caller)
  public shared ({ caller }) func transferFrom(owner : Principal, to : Principal, token : Text, amount : Nat) : async Bool {
    if (amount == 0) { return false };
    // Check allowance
    let allowed = await allowance(owner, caller, token);
    if (allowed < amount) { return false };
    // Check owner balance
    let ownerBal = await getBalance(owner, token);
    if (ownerBal < amount) { return false };

    // Deduct from owner
    switch (balances.get(owner)) {
      case null { return false };
      case (?userBalances) {
        userBalances.put(token, ownerBal - amount);
        balances.put(owner, userBalances);
      };
    };
    // Add to recipient
    switch (balances.get(to)) {
      case null {
        let newUserBalances = HashMap.HashMap<Text, Nat>(10, Text.equal, func(t : Text) : Nat32 { 0 });
        newUserBalances.put(token, amount);
        balances.put(to, newUserBalances);
      };
      case (?userBalances) {
        let currentBalance = switch (userBalances.get(token)) { case null { 0 }; case (?b) { b } };
        userBalances.put(token, currentBalance + amount);
        balances.put(to, userBalances);
      };
    };

    // Reduce allowance
    switch (allowances.get(owner)) {
      case (?ownerMap) {
        switch (ownerMap.get(caller)) {
          case (?spenderMap) {
            let current = switch (spenderMap.get(token)) { case null { 0 }; case (?a) a };
            let newA = if (current > amount) { current - amount } else { 0 };
            spenderMap.put(token, newA);
            ownerMap.put(caller, spenderMap);
            allowances.put(owner, ownerMap);
          };
          case null {};
        }
      };
      case null {};
    };

    // Record transaction
    let tx : Transaction = { id = nextTransactionId; from = owner; to = to; token = token; amount = amount; timestamp = Int.abs(Time.now()); tx_type = "transferFrom" };
    switch (transactions.get(owner)) { case null { transactions.put(owner, [tx]) }; case (?t) { transactions.put(owner, Array.append(t, [tx])) } };
    if (not Principal.equal(owner, to)) {
      switch (transactions.get(to)) { case null { transactions.put(to, [tx]) }; case (?t) { transactions.put(to, Array.append(t, [tx])) } };
    };
    nextTransactionId += 1;
    true
  };

  // System functions for persistence
  system func preupgrade() {
    balancesArr := [];
    for ((user, userBalances) in balances.entries()) {
      for ((token, amount) in userBalances.entries()) {
        balancesArr := Array.append(balancesArr, [{ user = user; token = token; amount = amount; last_updated = Int.abs(Time.now()) }]);
      };
    };
    transactionsArr := Array.flatten<Transaction>(Iter.toArray(transactions.vals()));
    allowancesArr := [];
    for ((owner, ownerMap) in allowances.entries()) {
      for ((spender, spenderMap) in ownerMap.entries()) {
        for ((token, amt) in spenderMap.entries()) {
          allowancesArr := Array.append(allowancesArr, [(owner, spender, token, amt)]);
        };
      };
    };
  };

  system func postupgrade() {
    balances := HashMap.HashMap<Principal, HashMap.HashMap<Text, Nat>>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
    for (balance in balancesArr.vals()) {
      switch (balances.get(balance.user)) {
        case null {
          let userBalances = HashMap.HashMap<Text, Nat>(10, Text.equal, func(t : Text) : Nat32 { 0 });
          userBalances.put(balance.token, balance.amount);
          balances.put(balance.user, userBalances);
        };
        case (?userBalances) {
          userBalances.put(balance.token, balance.amount);
          balances.put(balance.user, userBalances);
        };
      };
    };
    
    transactions := HashMap.HashMap<Principal, [Transaction]>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
    for (tx in transactionsArr.vals()) {
      switch (transactions.get(tx.from)) { case null { transactions.put(tx.from, [tx]) }; case (?userTxs) { transactions.put(tx.from, Array.append(userTxs, [tx])) } };
      if (not Principal.equal(tx.from, tx.to)) {
        switch (transactions.get(tx.to)) { case null { transactions.put(tx.to, [tx]) }; case (?userTxs) { transactions.put(tx.to, Array.append(userTxs, [tx])) } };
      };
    };

    allowances := HashMap.HashMap<Principal, HashMap.HashMap<Principal, HashMap.HashMap<Text, Nat>>>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
    for ((owner, spender, token, amt) in allowancesArr.vals()) {
      let ownerMap = switch (allowances.get(owner)) { case null { let m = HashMap.HashMap<Principal, HashMap.HashMap<Text, Nat>>(10, Principal.equal, func(p : Principal) : Nat32 { 0 }); allowances.put(owner, m); m }; case (?m) m };
      let spenderMap = switch (ownerMap.get(spender)) { case null { let m = HashMap.HashMap<Text, Nat>(10, Text.equal, func(t : Text) : Nat32 { 0 }); ownerMap.put(spender, m); m }; case (?m) m };
      spenderMap.put(token, amt);
      ownerMap.put(spender, spenderMap);
      allowances.put(owner, ownerMap);
    };
  };

  // Get user's balance for a specific token
  public shared query func getBalance(user : Principal, token : Text) : async Nat {
    switch (balances.get(user)) {
      case null { 0 };
      case (?userBalances) {
        switch (userBalances.get(token)) {
          case null { 0 };
          case (?amount) { amount };
        };
      };
    };
  };

  // Get user's SPICY balance (convenience function)
  public shared query func getSpicyBalance(user : Principal) : async Nat {
    switch (balances.get(user)) {
      case null { 0 };
      case (?userBalances) {
        switch (userBalances.get("SPICY")) {
          case null { 0 };
          case (?amount) { amount };
        };
      };
    };
  };

  // Get all balances for a user
  public shared query func getAllBalances(user : Principal) : async [Balance] {
    switch (balances.get(user)) {
      case null { [] };
      case (?userBalances) {
        var userBalancesArray : [Balance] = [];
        for ((token, amount) in userBalances.entries()) {
          userBalancesArray := Array.append(userBalancesArray, [{ user = user; token = token; amount = amount; last_updated = Int.abs(Time.now()) }]);
        };
        userBalancesArray
      };
    };
  };

  // Transfer tokens between users
  public shared ({ caller }) func transfer(to : Principal, token : Text, amount : Nat) : async Bool {
    if (amount == 0) { return false };
    
    let fromBalance = await getBalance(caller, token);
    if (fromBalance < amount) { return false };
    
    // Update sender's balance
    switch (balances.get(caller)) {
      case null { return false };
      case (?userBalances) {
        let newFromBalance = fromBalance - amount;
        userBalances.put(token, newFromBalance);
        balances.put(caller, userBalances);
      };
    };
    
    // Update receiver's balance
    switch (balances.get(to)) {
      case null {
        let newUserBalances = HashMap.HashMap<Text, Nat>(10, Text.equal, func(t : Text) : Nat32 { 0 });
        newUserBalances.put(token, amount);
        balances.put(to, newUserBalances);
      };
      case (?userBalances) {
        let currentBalance = switch (userBalances.get(token)) { case null { 0 }; case (?b) { b } };
        userBalances.put(token, currentBalance + amount);
        balances.put(to, userBalances);
      };
    };
    
    // Record transaction
    let transaction : Transaction = {
      id = nextTransactionId;
      from = caller;
      to = to;
      token = token;
      amount = amount;
      timestamp = Int.abs(Time.now());
      tx_type = "transfer";
    };
    
    // Add to sender's transactions
    switch (transactions.get(caller)) {
      case null { transactions.put(caller, [transaction]) };
      case (?userTxs) { transactions.put(caller, Array.append(userTxs, [transaction])) };
    };
    
    // Add to receiver's transactions (if different from sender)
    if (not Principal.equal(caller, to)) {
      switch (transactions.get(to)) {
        case null { transactions.put(to, [transaction]) };
        case (?userTxs) { transactions.put(to, Array.append(userTxs, [transaction])) };
      };
    };
    
    nextTransactionId += 1;
    true
  };

  // Mint tokens (admin only)
  public shared ({ caller }) func mint(to : Principal, token : Text, amount : Nat) : async Bool {
    if (not Principal.equal(caller, Principal.fromText(Constants.ADMIN_PRINCIPAL_TEXT))) {
      return false;
    };
    
    if (amount == 0) { return false };
    
    // Update receiver's balance
    switch (balances.get(to)) {
      case null {
        let newUserBalances = HashMap.HashMap<Text, Nat>(10, Text.equal, func(t : Text) : Nat32 { 0 });
        newUserBalances.put(token, amount);
        balances.put(to, newUserBalances);
      };
      case (?userBalances) {
        let currentBalance = switch (userBalances.get(token)) { case null { 0 }; case (?b) { b } };
        userBalances.put(token, currentBalance + amount);
        balances.put(to, userBalances);
      };
    };
    
    // Record transaction
    let transaction : Transaction = {
      id = nextTransactionId;
      from = caller;
      to = to;
      token = token;
      amount = amount;
      timestamp = Int.abs(Time.now());
      tx_type = "mint";
    };
    
    // Add to receiver's transactions
    switch (transactions.get(to)) {
      case null { transactions.put(to, [transaction]) };
      case (?userTxs) { transactions.put(to, Array.append(userTxs, [transaction])) };
    };
    
    nextTransactionId += 1;
    true
  };

  // Get user's transaction history
  public shared query func getTransactionHistory(user : Principal) : async [Transaction] {
    switch (transactions.get(user)) {
      case null { [] };
      case (?userTxs) { userTxs };
    };
  };

  // Get supported tokens
  public shared query func getSupportedTokens() : async [Token] {
    supportedTokens
  };

  // Get wallet statistics
  public shared query func getWalletStats() : async { total_users : Nat; total_transactions : Nat; total_volume : Nat } {
    let total_users = balances.size();
    let total_transactions = transactionsArr.size();
    let total_volume = Array.foldLeft<Transaction, Nat>(transactionsArr, 0, func(acc, tx) { acc + tx.amount });
    { total_users = total_users; total_transactions = total_transactions; total_volume = total_volume }
  };

  // ICRC support
  public type Account = { owner : Principal; subaccount : ?Blob };
  public type TransferArg = {
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    from_subaccount : ?Blob;
    created_at_time : ?Nat64;
  };
  public type TransferError = {
    #GenericError : { message : Text; error_code : Nat };
    #TemporarilyUnavailable : {};
    #BadBurn : { min_burn_amount : Nat };
    #Duplicate : { duplicate_of : Nat };
    #BadFee : { expected_fee : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld : {};
    #CreatedInFuture : {};
    #BadRecipient : { message : Text };
  };
  public type TransferResult = { #Ok : Nat; #Err : TransferError };

  public type ApproveArgs = {
    spender : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    from_subaccount : ?Blob;
    created_at_time : ?Nat64;
    expires_at : ?Nat64;
    expected_allowance : ?Nat;
  };
  public type AllowanceArgs = { account : Account; spender : Account };
  public type Allowance = { allowance : Nat; expires_at : ?Nat64 };
  public type ApproveError = {
    #GenericError : { message : Text; error_code : Nat };
    #TemporarilyUnavailable : {};
    #Duplicate : { duplicate_of : Nat };
    #BadFee : { expected_fee : Nat };
    #AllowanceChanged : { current_allowance : Nat };
    #Expired : { ledger_time : Nat64 };
    #TooOld : {};
    #CreatedInFuture : { ledger_time : Nat64 };
    #InsufficientFunds : { balance : Nat };
  };
  public type ApproveResult = { #Ok : Nat; #Err : ApproveError };

  public type TransferFromArgs = {
    spender_subaccount : ?Blob;
    from : Account;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };
  public type TransferFromError = TransferError;
  public type TransferFromResult = { #Ok : Nat; #Err : TransferFromError };

  public type Icrc = actor {
    icrc1_balance_of : shared query (Account) -> async Nat;
    icrc1_transfer : shared (TransferArg) -> async TransferResult;
    icrc2_approve : shared (ApproveArgs) -> async ApproveResult;
    icrc2_allowance : shared query (AllowanceArgs) -> async Allowance;
    icrc2_transfer_from : shared (TransferFromArgs) -> async TransferFromResult;
  };

  stable var icrcTokenIds : [Principal] = [];

  public shared ({ caller }) func addIcrcToken(tokenCanister : Principal) : async Bool {
    // Optional: admin gate
    let exists = Array.find<Principal>(icrcTokenIds, func(p) { Principal.equal(p, tokenCanister) });
    switch (exists) { case (?_) { true }; case null { icrcTokenIds := Array.append(icrcTokenIds, [tokenCanister]); true } };
  };

  public shared query func listIcrcTokens() : async [Principal] { icrcTokenIds };

  func icrcRef(p : Principal) : Icrc { actor (Principal.toText(p)) };

  public shared func icrcBalance(token : Principal, owner : Principal) : async Nat {
    await icrcRef(token).icrc1_balance_of({ owner = owner; subaccount = null })
  };

  public shared ({ caller }) func icrcTransfer(token : Principal, to : Principal, amount : Nat) : async Bool {
    let res = await icrcRef(token).icrc1_transfer({
      to = { owner = to; subaccount = null };
      amount = amount;
      fee = null; memo = null; from_subaccount = null; created_at_time = null
    });
    switch (res) { case (#Ok _) true; case (#Err _) false }
  };

  public shared func icrcApprove(token : Principal, spender : Principal, amount : Nat) : async Bool {
    let res = await icrcRef(token).icrc2_approve({
      spender = { owner = spender; subaccount = null };
      amount = amount;
      fee = null; memo = null; from_subaccount = null; created_at_time = null; expires_at = null; expected_allowance = null
    });
    switch (res) { case (#Ok _) true; case (#Err _) false }
  };

  public shared func icrcAllowance(token : Principal, owner : Principal, spender : Principal) : async Nat {
    let a = await icrcRef(token).icrc2_allowance({ account = { owner = owner; subaccount = null }; spender = { owner = spender; subaccount = null } });
    a.allowance
  };

  public shared ({ caller }) func icrcTransferFrom(token : Principal, owner : Principal, to : Principal, amount : Nat) : async Bool {
    let res = await icrcRef(token).icrc2_transfer_from({
      spender_subaccount = null;
      from = { owner = owner; subaccount = null };
      to = { owner = to; subaccount = null };
      amount = amount;
      fee = null; memo = null; created_at_time = null
    });
    switch (res) { case (#Ok _) true; case (#Err _) false }
  };

  // ICRC compatibility functions for IdentityKit/OISY support
  public type SupportedStandard = {
    url : Text;
    name : Text;
  };

  public query func icrc10_supported_standards() : async [SupportedStandard] {
    [
      { url = "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-10/ICRC-10.md"; name = "ICRC-10" },
      { url = "https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_28_trusted_origins.md"; name = "ICRC-28" }
    ]
  };

  public type Icrc28TrustedOriginsResponse = {
    trusted_origins : [Text];
  };

  public func icrc28_trusted_origins() : async Icrc28TrustedOriginsResponse {
    let trusted_origins = [
      "https://oo7fg-waaaa-aaaap-qp5sq-cai.icp0.io",
      "https://oo7fg-waaaa-aaaap-qp5sq-cai.raw.icp0.io",
      "https://oo7fg-waaaa-aaaap-qp5sq-cai.ic0.app",
      "https://oo7fg-waaaa-aaaap-qp5sq-cai.raw.ic0.app"
    ];
    { trusted_origins = trusted_origins }
  };

  // ICRC-21 consent message for OISY wallet
  public type Icrc21ConsentMessageRequest = {
    method : Text;
    arg : Blob;
    user_preferences : {
      metadata : {
        language : Text;
      };
    };
  };

  public type DisplayMessageType = {
    #LineDisplayMessage : { pages : [{ lines : [Text] }] };
    #GenericDisplayMessage : Text;
  };

  public type Icrc21ConsentInfo = {
    metadata : {
      language : Text;
    };
    consent_message : DisplayMessageType;
  };

  public type Icrc21ConsentMessageResponse = {
    #Ok : Icrc21ConsentInfo;
    #Err : { #GenericError : { error_code : Nat; message : Text }; #UnsupportedCanisterCall : {}; #ConsentMessageUnavailable : {} };
  };

  public func icrc21_canister_call_consent_message(request : Icrc21ConsentMessageRequest) : async Icrc21ConsentMessageResponse {
    let method = request.method;
    let language = request.user_preferences.metadata.language;
    
    let message_text = switch (method) {
      case ("transfer") { "Transfer tokens from your wallet to another account" };
      case ("approve") { "Approve another account to spend tokens on your behalf" };
      case ("icrcTransfer") { "Transfer ICRC tokens to another account" };
      case ("icrcApprove") { "Approve ICRC token spending allowance" };
      case ("icrcTransferFrom") { "Transfer ICRC tokens using approved allowance" };
      case ("getSpicyBalance") { "View your SPICY token balance" };
      case ("getAllBalances") { "View all your token balances" };
      case ("icrcBalance") { "View ICRC token balance" };
      case ("registerUser") { "Register your principal in the wallet system" };
      case (_) { "Execute method: " # method # " on wallet canister" };
    };

    #Ok({
      metadata = { language = language };
      consent_message = #GenericDisplayMessage(message_text);
    })
  };
} 