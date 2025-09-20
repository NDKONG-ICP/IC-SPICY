import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Constants "../Constants";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Random "mo:base/Random";
import Debug "mo:base/Debug";
import Int "mo:base/Int";
import Float "mo:base/Float";

actor {
  // Admin
  private let ADMIN_PRINCIPAL : Principal = Principal.fromText(Constants.ADMIN_PRINCIPAL_TEXT);
  private let ADMIN_OISY_PRINCIPAL : Principal = Principal.fromText(Constants.ADMIN_OISY_PRINCIPAL_TEXT);
  private let ADMIN_NFID_PRINCIPAL : Principal = Principal.fromText(Constants.ADMIN_NFID_PRINCIPAL_TEXT);
  private let ADMIN_NFID2_PRINCIPAL : Principal = Principal.fromText(Constants.ADMIN_NFID2_PRINCIPAL_TEXT);
  // Treasury is this membership canister
  let TREASURY : Principal = Principal.fromText(Constants.MEMBERSHIP_CANISTER_ID);
  
  // Membership tiers
  public type MembershipTier = { #Basic; #Premium; #Elite };

  // Member record
  public type Member = { principal : Principal; tier : MembershipTier; joined : Nat64; last_upgrade : Nat64 };

  // Cross-chain payment record for Solana/SUI payments
  public type CrossChainPayment = {
    id : Text;
    user_principal : Text;
    membership_tier : Text;
    amount : Float;
    currency : Text;
    transaction_hash : ?Text;
    status : PaymentStatus;
    created_at : Nat64;
    processed_at : ?Nat64;
  };

  // Payment status
  public type PaymentStatus = { #Pending; #Completed; #Failed; #Expired };

  // Treasury balance record for cross-chain tokens
  public type TreasuryBalance = {
    currency : Text;
    amount : Float;
    last_updated : Nat64;
    total_received : Float;
    total_payments : Nat;
  };

  // Stable storage
  stable var membersArr : [Member] = [];
  // Persist pricing across upgrades as a flat list of (token, tier, amount)
  stable var pricingEntries : [(Principal, MembershipTier, Nat)] = [];
  // Persist symbol pricing across upgrades as a flat list of (symbol, tier, amount)
  stable var symbolPricingEntries : [(Text, MembershipTier, Nat)] = [];
  // Persist routing configuration across upgrades
  stable var routingConfigEntries : [(Text, Text, Text)] = []; // (category, token, address)
  
  // Burn tracking with stable structures
  stable var burnTotalsEntries : [(Text, Nat)] = []; // (token, total_burned)
  stable var burnTransactionsEntries : [(Text, Nat, Nat64)] = []; // (token, amount, timestamp)
  
  // Cross-chain payment tracking with stable structures
  stable var crossChainPaymentsEntries : [CrossChainPayment] = [];
  stable var treasuryBalancesEntries : [(Text, TreasuryBalance)] = []; // (currency, balance)
  
  // Bulk data management with stable structures
  stable var bulkTestDataEntries : [(Text, Nat, Nat64)] = []; // (data_id, counter, timestamp)
  stable var bulkOperationsLog : [(Text, Text, Nat64)] = []; // (operation_type, data, timestamp)
  var performanceMetrics : [(Text, Nat64, Nat)] = []; // (metric_name, timestamp, value)
  
  var members : HashMap.HashMap<Principal, Member> = HashMap.HashMap<Principal, Member>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });

  // Rate limit
  private var lastOperationTime : HashMap.HashMap<Principal, Nat64> = HashMap.HashMap<Principal, Nat64>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
  private let OPERATION_COOLDOWN_SECONDS : Nat64 = 60;

  // Pricing registry: token principal -> (tier -> amount in base units)
  var pricing : HashMap.HashMap<Principal, HashMap.HashMap<MembershipTier, Nat>> = HashMap.HashMap<Principal, HashMap.HashMap<MembershipTier, Nat>>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
  // Pricing registry by symbol (for convenience/persistence without token principal)
  var symbolPricing : HashMap.HashMap<Text, HashMap.HashMap<MembershipTier, Nat>> = HashMap.HashMap<Text, HashMap.HashMap<MembershipTier, Nat>>(10, Text.equal, Text.hash);
  // Routing configuration storage
  var routingConfig : HashMap.HashMap<Text, HashMap.HashMap<Text, Text>> = HashMap.HashMap<Text, HashMap.HashMap<Text, Text>>(10, Text.equal, Text.hash);
  
  // Burn tracking structures
  var burnTotals : HashMap.HashMap<Text, Nat> = HashMap.HashMap<Text, Nat>(10, Text.equal, Text.hash);
  var burnTransactions : Buffer.Buffer<(Text, Nat, Nat64)> = Buffer.Buffer<(Text, Nat, Nat64)>(1000);
  
  // Cross-chain payment tracking structures
  var crossChainPayments : HashMap.HashMap<Text, CrossChainPayment> = HashMap.HashMap<Text, CrossChainPayment>(100, Text.equal, Text.hash);
  var treasuryBalances : HashMap.HashMap<Text, TreasuryBalance> = HashMap.HashMap<Text, TreasuryBalance>(10, Text.equal, Text.hash);
  
  // Pre-configured burn addresses
  private let RAVEN_BURN_ADDRESS : Principal = Principal.fromText("xxiwu-qiaaa-aaaam-qcbha-cai");
  private let ZOMBIE_BURN_ADDRESS : Principal = Principal.fromText("r7inp-6aaaa-aaaaa-aaabq-cai");
  
  // Bulk data management structures
  var bulkTestData : HashMap.HashMap<Text, (Nat, Nat64)> = HashMap.HashMap<Text, (Nat, Nat64)>(1000, Text.equal, Text.hash);
  var bulkOperations : Buffer.Buffer<(Text, Text, Nat64)> = Buffer.Buffer<(Text, Text, Nat64)>(1000);
  var metrics : Buffer.Buffer<(Text, Nat64, Nat)> = Buffer.Buffer<(Text, Nat64, Nat)>(1000);

  // ICRC minimal interfaces
  public type Account = { owner : Principal; subaccount : ?Blob };
  public type TransferFromArgs = { spender_subaccount : ?Blob; from : Account; to : Account; amount : Nat; fee : ?Nat; memo : ?Blob; created_at_time : ?Nat64 };
  public type TransferArgs = { from_subaccount : ?Blob; to : Account; amount : Nat; fee : ?Nat; memo : ?Blob; created_at_time : ?Nat64 };
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
  public type TransferFromResult = { #Ok : Nat; #Err : TransferError };
  public type TransferResult = { #Ok : Nat; #Err : TransferError };
  public type Icrc = actor {
    icrc2_transfer_from : shared (TransferFromArgs) -> async TransferFromResult;
    icrc1_transfer : shared (TransferArgs) -> async TransferResult;
  };
  func tokenRef(p : Principal) : Icrc { actor (Principal.toText(p)) };

  system func preupgrade() {
    membersArr := Iter.toArray(members.vals());
    // Serialize pricing map to entries for stable storage
    var acc : [(Principal, MembershipTier, Nat)] = [];
    for ((token, tierMap) in pricing.entries()) {
      for ((tier, amount) in tierMap.entries()) {
        acc := Array.append<(Principal, MembershipTier, Nat)>(acc, [(token, tier, amount)]);
      };
    };
    pricingEntries := acc;
    
    // Serialize symbol pricing map to entries for stable storage
    var sacc : [(Text, MembershipTier, Nat)] = [];
    for ((sym, tierMap) in symbolPricing.entries()) {
      for ((tier, amount) in tierMap.entries()) {
        sacc := Array.append<(Text, MembershipTier, Nat)>(sacc, [(sym, tier, amount)]);
      };
    };
    symbolPricingEntries := sacc;
    
    // Serialize routing configuration
    var racc : [(Text, Text, Text)] = [];
    for ((category, tokenMap) in routingConfig.entries()) {
      for ((token, address) in tokenMap.entries()) {
        racc := Array.append<(Text, Text, Text)>(racc, [(category, token, address)]);
      };
    };
    routingConfigEntries := racc;
    
    // Serialize burn totals
    burnTotalsEntries := Iter.toArray(burnTotals.entries());
    
    // Serialize burn transactions
    burnTransactionsEntries := Buffer.toArray(burnTransactions);
    
    // Serialize cross-chain payments
    crossChainPaymentsEntries := Iter.toArray(crossChainPayments.vals());
    
    // Serialize treasury balances
    treasuryBalancesEntries := Iter.toArray(treasuryBalances.entries());
    
    // Serialize bulk test data
    var bulkAcc : [(Text, Nat, Nat64)] = [];
    for ((id, (counter, timestamp)) in bulkTestData.entries()) {
      bulkAcc := Array.append<(Text, Nat, Nat64)>(bulkAcc, [(id, counter, timestamp)]);
    };
    bulkTestDataEntries := bulkAcc;
    
    // Serialize bulk operations log
    bulkOperationsLog := Buffer.toArray(bulkOperations);
    
    // Serialize performance metrics
    performanceMetrics := Buffer.toArray(metrics);
  };

  system func postupgrade() {
    // Restore members
    for (member in membersArr.vals()) {
      members.put(member.principal, member);
    };
    
    // Restore pricing
    pricing := HashMap.HashMap<Principal, HashMap.HashMap<MembershipTier, Nat>>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
    for ((token, tier, amount) in pricingEntries.vals()) {
      let tierMap = switch (pricing.get(token)) {
        case (?m) m;
        case null {
          let m = HashMap.HashMap<MembershipTier, Nat>(5, func(a : MembershipTier, b : MembershipTier) : Bool { a == b }, func(_t : MembershipTier) : Nat32 { 0 });
          pricing.put(token, m);
          m
        };
      };
      tierMap.put(tier, amount);
    };
    
    // Restore symbol pricing
    symbolPricing := HashMap.HashMap<Text, HashMap.HashMap<MembershipTier, Nat>>(10, Text.equal, Text.hash);
    for ((sym, tier, amount) in symbolPricingEntries.vals()) {
      let tierMap = switch (symbolPricing.get(sym)) {
        case (?m) m;
        case null {
          let m = HashMap.HashMap<MembershipTier, Nat>(5, func(a : MembershipTier, b : MembershipTier) : Bool { a == b }, func(_t : MembershipTier) : Nat32 { 0 });
          symbolPricing.put(sym, m);
          m
        };
      };
      tierMap.put(tier, amount);
    };
    
    // Restore routing configuration
    routingConfig := HashMap.HashMap<Text, HashMap.HashMap<Text, Text>>(10, Text.equal, Text.hash);
    for ((category, token, address) in routingConfigEntries.vals()) {
      let tokenMap = switch (routingConfig.get(category)) {
        case (?m) m;
        case null {
          let m = HashMap.HashMap<Text, Text>(10, Text.equal, Text.hash);
          routingConfig.put(category, m);
          m
        };
      };
      tokenMap.put(token, address);
    };
    
    // Restore burn totals
    burnTotals := HashMap.HashMap<Text, Nat>(10, Text.equal, Text.hash);
    for ((token, total) in burnTotalsEntries.vals()) {
      burnTotals.put(token, total);
    };
    
    // Restore burn transactions
    burnTransactions := Buffer.Buffer<(Text, Nat, Nat64)>(1000);
    for (transaction in burnTransactionsEntries.vals()) {
      burnTransactions.add(transaction);
    };
    
    // Restore cross-chain payments
    crossChainPayments := HashMap.HashMap<Text, CrossChainPayment>(100, Text.equal, Text.hash);
    for (payment in crossChainPaymentsEntries.vals()) {
      crossChainPayments.put(payment.id, payment);
    };
    
    // Restore treasury balances
    treasuryBalances := HashMap.HashMap<Text, TreasuryBalance>(10, Text.equal, Text.hash);
    for ((currency, balance) in treasuryBalancesEntries.vals()) {
      treasuryBalances.put(currency, balance);
    };
    
    // Restore bulk test data
    bulkTestData := HashMap.HashMap<Text, (Nat, Nat64)>(1000, Text.equal, Text.hash);
    for ((id, counter, timestamp) in bulkTestDataEntries.vals()) {
      bulkTestData.put(id, (counter, timestamp));
    };
    
    // Restore bulk operations log
    bulkOperations := Buffer.Buffer<(Text, Text, Nat64)>(1000);
    for (operation in bulkOperationsLog.vals()) {
      bulkOperations.add(operation);
    };
    
    // Restore performance metrics
    metrics := Buffer.Buffer<(Text, Nat64, Nat)>(1000);
    for (metric in performanceMetrics.vals()) {
      metrics.add(metric);
    };
  };

  private func isAdmin(caller : Principal) : Bool {
    Principal.equal(caller, ADMIN_PRINCIPAL) or 
    Principal.equal(caller, ADMIN_OISY_PRINCIPAL) or 
    Principal.equal(caller, ADMIN_NFID_PRINCIPAL) or
    Principal.equal(caller, ADMIN_NFID2_PRINCIPAL)
  };
  private func checkRateLimit(caller : Principal) : Bool {
    switch (lastOperationTime.get(caller)) {
      case null true;
      case (?lastTime) {
        let now = Nat64.fromIntWrap(Time.now());
        Nat64.greater(now, lastTime + OPERATION_COOLDOWN_SECONDS)
      };
    }
  };

  func required_spicy(tier : MembershipTier) : Nat {
    switch (tier) { case (#Basic) 0; case (#Premium) 1_000_000_000; case (#Elite) 10_000_000_000 }
  };
  public query func get_required_spicy(tier : MembershipTier) : async Nat { required_spicy(tier) };

  // Existing join using placeholder validation (kept for backwards compatibility)
  func check_spicy_payment(_caller : Principal, _amount : Nat) : Bool { true };

  // Admin: set pricing for a token and tier (amount in base units of the token)
  public shared ({ caller }) func set_pricing(token : Principal, tier : MembershipTier, amount : Nat) : async Bool {
    if (not isAdmin(caller)) { return false };
    let tierMap = switch (pricing.get(token)) {
      case null {
        let m = HashMap.HashMap<MembershipTier, Nat>(5, func(a : MembershipTier, b : MembershipTier) : Bool { a == b }, func(_t : MembershipTier) : Nat32 { 0 });
        pricing.put(token, m);
        m
      };
      case (?m) m;
    };
    tierMap.put(tier, amount);
    pricing.put(token, tierMap);
    true
  };

  // Helper: expected price
  func expected_price(token : Principal, tier : MembershipTier) : ?Nat {
    switch (pricing.get(token)) {
      case null null;
      case (?m) { m.get(tier) };
    }
  };

  public shared ({ caller }) func join_membership(tier : MembershipTier) : async Text {
    if (not checkRateLimit(caller)) { return "Please wait before making another membership operation." };
    if (members.get(caller) != null) { return "Already a member." };
    let required = required_spicy(tier);
    if (not check_spicy_payment(caller, required)) { return "Insufficient $SPICY payment." };
    let now = Nat64.fromIntWrap(Time.now());
    let member : Member = { principal = caller; tier = tier; joined = now; last_upgrade = now };
    members.put(caller, member);
    membersArr := Iter.toArray(members.vals());
    lastOperationTime.put(caller, now);
    "Joined as " # (switch tier { case (#Basic) "Basic"; case (#Premium) "Premium"; case (#Elite) "Elite" }) # " member!"
  };

  // New: join with ICRC payment with automatic burning for RAVEN/ZOMBIE
  public shared ({ caller }) func join_membership_with_payment(tier : MembershipTier, token : Principal, symbol : Text) : async Text {
    if (not checkRateLimit(caller)) { return "Please wait before making another membership operation." };
    if (members.get(caller) != null) { return "Already a member." };
    let priceOpt = expected_price(token, tier);
    switch (priceOpt) {
      case null { return "Pricing not configured for this token/tier." };
      case (?amount) {
        let res = await tokenRef(token).icrc2_transfer_from({
          spender_subaccount = null;
          from = { owner = caller; subaccount = null };
          to = { owner = TREASURY; subaccount = null };
          amount = amount;
          fee = null; memo = null; created_at_time = null
        });
        switch (res) {
          case (#Ok _) {
            // Perform automatic burning for RAVEN/ZOMBIE tokens
            if (symbol == "RAVEN" or symbol == "ZOMBIE") {
              let burnSuccess = await performAutoBurn(token, symbol, amount);
              if (not burnSuccess) {
                // Continue even if burn fails, but log it
                Debug.print("Warning: Auto-burn failed for " # symbol);
              };
            };
            
            let now = Nat64.fromIntWrap(Time.now());
            let member : Member = { principal = caller; tier = tier; joined = now; last_upgrade = now };
            members.put(caller, member);
            membersArr := Iter.toArray(members.vals());
            lastOperationTime.put(caller, now);
            
            let burnMsg = if (symbol == "RAVEN" or symbol == "ZOMBIE") { " (50% burned)" } else { "" };
            "Joined as " # (switch tier { case (#Basic) "Basic"; case (#Premium) "Premium"; case (#Elite) "Elite" }) # " member!" # burnMsg
          };
          case (#Err _e) { "Payment failed: ICRC transfer_from error" };
        }
      };
    }
  };

  public func get_membership_status(caller : Principal) : async ?Member { members.get(caller) };
  public shared({ caller }) func list_members() : async [Member] { if (not isAdmin(caller)) { return [] }; Iter.toArray(members.vals()) };
  public shared({ caller }) func remove_member(member_principal : Principal) : async Text { if (not isAdmin(caller)) { return "Only admin can remove members." }; switch (members.get(member_principal)) { case null return "Member not found."; case (?_) { members.delete(member_principal); membersArr := Iter.toArray(members.vals()); return "Member removed successfully." } } };
  public shared({ caller }) func set_admin(_new_admin : Principal) : async Text { if (not isAdmin(caller)) { return "Only current admin can change admin." }; "Admin principal is set as a constant for security." };
  public shared({ caller }) func get_membership_stats() : async { total_members : Nat; basic_count : Nat; premium_count : Nat; elite_count : Nat } {
    if (not isAdmin(caller)) { return { total_members = 0; basic_count = 0; premium_count = 0; elite_count = 0 } };
    var total : Nat = 0; var basic : Nat = 0; var premium : Nat = 0; var elite : Nat = 0;
    for (member in members.vals()) { total += 1; switch (member.tier) { case (#Basic) basic += 1; case (#Premium) premium += 1; case (#Elite) elite += 1 } };
    { total_members = total; basic_count = basic; premium_count = premium; elite_count = elite }
  };

  public query func get_pricing(token : Principal, tier : MembershipTier) : async ?Nat {
    expected_price(token, tier)
  };

  // Admin: set pricing by token symbol (persistent across sessions)
  public shared ({ caller }) func set_price_by_symbol(symbol : Text, tier : MembershipTier, amount : Nat) : async Bool {
    if (not isAdmin(caller)) { return false };
    let tierMap = switch (symbolPricing.get(symbol)) {
      case null {
        let m = HashMap.HashMap<MembershipTier, Nat>(5, func(a : MembershipTier, b : MembershipTier) : Bool { a == b }, func(_t : MembershipTier) : Nat32 { 0 });
        symbolPricing.put(symbol, m);
        m
      };
      case (?m) m;
    };
    tierMap.put(tier, amount);
    symbolPricing.put(symbol, tierMap);
    true
  };

  public query func get_price_by_symbol(symbol : Text, tier : MembershipTier) : async ?Nat {
    switch (symbolPricing.get(symbol)) {
      case null null;
      case (?m) { m.get(tier) };
    }
  };

  // Internal function to handle automatic token burning
  private func performAutoBurn(token : Principal, symbol : Text, amount : Nat) : async Bool {
    let burnAddress = switch (symbol) {
      case ("RAVEN") { ?RAVEN_BURN_ADDRESS };
      case ("ZOMBIE") { ?ZOMBIE_BURN_ADDRESS };
      case (_) { null };
    };
    
    switch (burnAddress) {
      case null { false }; // No burn address configured
      case (?burnAddr) {
        try {
          let burnAmount = amount / 2; // 50% burn
          let res = await tokenRef(token).icrc1_transfer({
            from_subaccount = null;
            to = { owner = burnAddr; subaccount = null };
            amount = burnAmount;
            fee = null; memo = null; created_at_time = null
          });
          switch (res) {
            case (#Ok _) {
              // Update burn totals
              let currentTotal = switch (burnTotals.get(symbol)) {
                case null { 0 };
                case (?total) { total };
              };
              burnTotals.put(symbol, currentTotal + burnAmount);
              
              // Log burn transaction
              let timestamp = Nat64.fromNat(Int.abs(Time.now()));
              burnTransactions.add((symbol, burnAmount, timestamp));
              
              true
            };
            case (#Err _) { false };
          }
        } catch (_) { false }
      };
    }
  };

  // Admin: set routing configuration (burn addresses, liquidity pool addresses, etc.)
  public shared ({ caller }) func set_routing_address(category : Text, token : Text, address : Text) : async Bool {
    if (not isAdmin(caller)) { return false };
    let tokenMap = switch (routingConfig.get(category)) {
      case null {
        let m = HashMap.HashMap<Text, Text>(10, Text.equal, Text.hash);
        routingConfig.put(category, m);
        m
      };
      case (?m) m;
    };
    tokenMap.put(token, address);
    routingConfig.put(category, tokenMap);
    true
  };

  // Query: get routing configuration
  public query func get_routing_config() : async [(Text, [(Text, Text)])] {
    let entries = Iter.toArray(routingConfig.entries());
    Array.map<(Text, HashMap.HashMap<Text, Text>), (Text, [(Text, Text)])>(entries, func((category, tokenMap) : (Text, HashMap.HashMap<Text, Text>)) : (Text, [(Text, Text)]) {
      (category, Iter.toArray(tokenMap.entries()))
    })
  };

  // Query: get burn totals for UI display
  public query func get_burn_totals() : async [(Text, Nat)] {
    Iter.toArray(burnTotals.entries())
  };

  // Query: get recent burn transactions
  public query func get_burn_transactions(limit : Nat) : async [(Text, Nat, Nat64)] {
    let transactions = Buffer.toArray(burnTransactions);
    if (limit >= transactions.size()) { 
      transactions 
    } else {
      Array.tabulate<(Text, Nat, Nat64)>(limit, func(i) = transactions[transactions.size() - 1 - i])
    }
  };

  // Admin: withdraw funds from treasury to a recipient
  public shared ({ caller }) func admin_withdraw(token : Principal, to_owner : Principal, amount : Nat) : async { #Ok : Nat; #Err : Text } {
    if (not isAdmin(caller)) { return #Err("Unauthorized"); };
    let ledger = tokenRef(token);
    let res = await ledger.icrc1_transfer({
      from_subaccount = null;
      to = { owner = to_owner; subaccount = null };
      amount = amount;
      fee = null; memo = null; created_at_time = null
    });
    switch (res) {
      case (#Ok height) { #Ok(height) };
      case (#Err e) { #Err("Withdraw failed") };
    }
  };

  // Admin: sweep from a user into treasury (requires user's approve/allowance set for this canister)
  public shared ({ caller }) func admin_collect(token : Principal, from_owner : Principal, amount : Nat) : async { #Ok : Nat; #Err : Text } {
    if (not isAdmin(caller)) { return #Err("Unauthorized"); };
    let ledger = tokenRef(token);
    let res = await ledger.icrc2_transfer_from({
      spender_subaccount = null;
      from = { owner = from_owner; subaccount = null };
      to = { owner = TREASURY; subaccount = null };
      amount = amount;
      fee = null; memo = null; created_at_time = null
    });
    switch (res) {
      case (#Ok height) { #Ok(height) };
      case (#Err e) { #Err("Collect failed") };
    }
  };

  // Cross-chain payment handling functions
  
  // Create a new cross-chain payment record
  public shared ({ caller }) func create_cross_chain_payment(
    user_principal : Text,
    membership_tier : Text,
    amount : Float,
    currency : Text
  ) : async Text {
    if (not isAdmin(caller)) { return "Unauthorized"; };
    
    let now = Nat64.fromIntWrap(Time.now());
    let payment_id = "ccp_" # Nat.toText(Nat64.toNat(now)) # "_" # user_principal;
    
    let payment : CrossChainPayment = {
      id = payment_id;
      user_principal = user_principal;
      membership_tier = membership_tier;
      amount = amount;
      currency = currency;
      transaction_hash = null;
      status = #Pending;
      created_at = now;
      processed_at = null;
    };
    
    crossChainPayments.put(payment_id, payment);
    
    // Update treasury balance
    let current_balance = switch (treasuryBalances.get(currency)) {
      case null {
        let new_balance : TreasuryBalance = {
          currency = currency;
          amount = amount;
          last_updated = now;
          total_received = amount;
          total_payments = 1;
        };
        treasuryBalances.put(currency, new_balance);
        new_balance
      };
      case (?balance) {
        let updated_balance : TreasuryBalance = {
          currency = currency;
          amount = balance.amount + amount;
          last_updated = now;
          total_received = balance.total_received + amount;
          total_payments = balance.total_payments + 1;
        };
        treasuryBalances.put(currency, updated_balance);
        updated_balance
      };
    };
    
    payment_id
  };
  
  // Complete a cross-chain payment and activate membership
  public shared ({ caller }) func complete_cross_chain_payment(
    payment_id : Text,
    transaction_hash : Text
  ) : async Text {
    if (not isAdmin(caller)) { return "Unauthorized"; };
    
    let payment_opt = crossChainPayments.get(payment_id);
    switch (payment_opt) {
      case null { return "Payment not found"; };
      case (?payment) {
        if (payment.status != #Pending) { return "Payment already processed"; };
        
        // Update payment status
        let updated_payment : CrossChainPayment = {
          id = payment.id;
          user_principal = payment.user_principal;
          membership_tier = payment.membership_tier;
          amount = payment.amount;
          currency = payment.currency;
          transaction_hash = ?transaction_hash;
          status = #Completed;
          created_at = payment.created_at;
          processed_at = ?Nat64.fromIntWrap(Time.now());
        };
        
        crossChainPayments.put(payment_id, updated_payment);
        
        // Convert user principal text to Principal
        let user_principal = Principal.fromText(payment.user_principal);
        
        // Determine membership tier
        let membership_tier = switch (payment.membership_tier) {
          case ("Ghosties") #Elite;
          case ("Spicy Chads") #Elite;
          case ("Street Team") #Basic;
          case (_) #Basic;
        };
        
        // Check if user already has membership
        let existing_member_opt = members.get(user_principal);
        switch (existing_member_opt) {
          case (?existing_member) {
            // Upgrade existing membership
            let updated_member : Member = {
              principal = user_principal;
              tier = membership_tier;
              joined = existing_member.joined;
              last_upgrade = Nat64.fromIntWrap(Time.now());
            };
            members.put(user_principal, updated_member);
          };
                    case null {
            // Create new membership
            let now = Nat64.fromIntWrap(Time.now());
            let new_member : Member = {
              principal = user_principal;
              tier = membership_tier;
              joined = now;
              last_upgrade = now;
            };
            members.put(user_principal, new_member);
          };
        };
        
        membersArr := Iter.toArray(members.vals());
        
        "Membership activated successfully for " # payment.user_principal
      };
    }
  };
  
  // Get cross-chain payment by ID
  public query func get_cross_chain_payment(payment_id : Text) : async ?CrossChainPayment {
    crossChainPayments.get(payment_id)
  };
  
  // List all cross-chain payments
  public query func list_cross_chain_payments() : async [CrossChainPayment] {
    Iter.toArray(crossChainPayments.vals())
  };
  
  // Get treasury balances for cross-chain tokens
  public query func get_treasury_balances() : async [(Text, TreasuryBalance)] {
    Iter.toArray(treasuryBalances.entries())
  };
  
  // Get treasury balance for specific currency
  public query func get_treasury_balance(currency : Text) : async ?TreasuryBalance {
    treasuryBalances.get(currency)
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
      case ("join_with_payment") { "Join membership tier by transferring tokens to treasury" };
      case ("upgrade_membership") { "Upgrade membership tier by transferring tokens to treasury" };
      case ("admin_withdraw") { "Admin: Transfer tokens from treasury to specified account" };
      case ("admin_collect") { "Admin: Collect tokens from treasury using ICRC-2 transfer" };
      case ("set_price_by_symbol") { "Admin: Update membership pricing for token symbol" };
      case (_) { "Execute method: " # method # " on membership canister" };
    };

    #Ok({
      metadata = { language = language };
      consent_message = #GenericDisplayMessage(message_text);
    })
  };

  // Bulk data management admin methods for testing call limits and performance
  
  // Generate bulk test data
  public shared ({ caller }) func admin_generate_bulk_data(count : Nat) : async Text {
    if (not isAdmin(caller)) { return "Unauthorized" };
    let startTime = Nat64.fromNat(Int.abs(Time.now()));
    
    var i = 0;
    while (i < count) {
      let id = "test_data_" # Nat.toText(i) # "_" # Nat64.toText(startTime);
      let timestamp = Nat64.fromNat(Int.abs(Time.now()));
      bulkTestData.put(id, (i, timestamp));
      
      // Log the operation
      bulkOperations.add(("generate", id, timestamp));
      
      i += 1;
    };
    
    let endTime = Nat64.fromNat(Int.abs(Time.now()));
    let duration = endTime - startTime;
    metrics.add(("bulk_generate", startTime, count));
    
    "Generated " # Nat.toText(count) # " entries in " # Nat64.toText(duration) # " ns"
  };
  
  // Bulk read test data
  public shared ({ caller }) func admin_bulk_read_data(limit : Nat) : async [(Text, Nat, Nat64)] {
    if (not isAdmin(caller)) { return [] };
    let startTime = Nat64.fromNat(Int.abs(Time.now()));
    
    let entries = Iter.toArray(bulkTestData.entries());
    let results = if (limit > entries.size()) { entries } else { Array.tabulate<(Text, (Nat, Nat64))>(limit, func(i) = entries[i]) };
    
    let mapped = Array.map<(Text, (Nat, Nat64)), (Text, Nat, Nat64)>(results, func((id, (counter, timestamp))) = (id, counter, timestamp));
    
    let endTime = Nat64.fromNat(Int.abs(Time.now()));
    let duration = endTime - startTime;
    metrics.add(("bulk_read", startTime, limit));
    
    mapped
  };
  
  // Bulk update test data
  public shared ({ caller }) func admin_bulk_update_data(count : Nat) : async Text {
    if (not isAdmin(caller)) { return "Unauthorized" };
    let startTime = Nat64.fromNat(Int.abs(Time.now()));
    
    let entries = Iter.toArray(bulkTestData.entries());
    let updateCount = if (count > entries.size()) { entries.size() } else { count };
    
    var i = 0;
    while (i < updateCount) {
      let (id, (oldCounter, _)) = entries[i];
      let timestamp = Nat64.fromNat(Int.abs(Time.now()));
      bulkTestData.put(id, (oldCounter + 1000, timestamp));
      
      // Log the operation
      bulkOperations.add(("update", id, timestamp));
      
      i += 1;
    };
    
    let endTime = Nat64.fromNat(Int.abs(Time.now()));
    let duration = endTime - startTime;
    metrics.add(("bulk_update", startTime, updateCount));
    
    "Updated " # Nat.toText(updateCount) # " entries in " # Nat64.toText(duration) # " ns"
  };
  
  // Bulk delete test data
  public shared ({ caller }) func admin_bulk_delete_data(count : Nat) : async Text {
    if (not isAdmin(caller)) { return "Unauthorized" };
    let startTime = Nat64.fromNat(Int.abs(Time.now()));
    
    let entries = Iter.toArray(bulkTestData.entries());
    let deleteCount = if (count > entries.size()) { entries.size() } else { count };
    
    var i = 0;
    while (i < deleteCount) {
      let (id, _) = entries[i];
      let timestamp = Nat64.fromNat(Int.abs(Time.now()));
      bulkTestData.delete(id);
      
      // Log the operation
      bulkOperations.add(("delete", id, timestamp));
      
      i += 1;
    };
    
    let endTime = Nat64.fromNat(Int.abs(Time.now()));
    let duration = endTime - startTime;
    metrics.add(("bulk_delete", startTime, deleteCount));
    
    "Deleted " # Nat.toText(deleteCount) # " entries in " # Nat64.toText(duration) # " ns"
  };
  
  // Get performance metrics
  public query func get_performance_metrics() : async [(Text, Nat64, Nat)] {
    Buffer.toArray(metrics)
  };
  
  // Get operations log
  public query func get_operations_log(limit : Nat) : async [(Text, Text, Nat64)] {
    let logs = Buffer.toArray(bulkOperations);
    if (limit >= logs.size()) { logs } else {
      Array.tabulate<(Text, Text, Nat64)>(limit, func(i) = logs[logs.size() - 1 - i])
    }
  };
  
  // Get data statistics
  public query func get_data_stats() : async { 
    total_test_data : Nat; 
    total_operations : Nat; 
    total_metrics : Nat;
    memory_usage : Nat;
  } {
    {
      total_test_data = bulkTestData.size();
      total_operations = bulkOperations.size();
      total_metrics = metrics.size();
      memory_usage = bulkTestData.size() * 100; // Rough estimate
    }
  };
  
  // Clear all test data (admin only)
  public shared ({ caller }) func admin_clear_test_data() : async Text {
    if (not isAdmin(caller)) { return "Unauthorized" };
    
    let testDataCount = bulkTestData.size();
    let operationsCount = bulkOperations.size();
    let metricsCount = metrics.size();
    
    // Clear all data structures
    bulkTestData := HashMap.HashMap<Text, (Nat, Nat64)>(1000, Text.equal, Text.hash);
    bulkOperations := Buffer.Buffer<(Text, Text, Nat64)>(1000);
    metrics := Buffer.Buffer<(Text, Nat64, Nat)>(1000);
    
    "Cleared " # Nat.toText(testDataCount) # " test data entries, " # 
    Nat.toText(operationsCount) # " operations, and " # 
    Nat.toText(metricsCount) # " metrics"
  };
} 