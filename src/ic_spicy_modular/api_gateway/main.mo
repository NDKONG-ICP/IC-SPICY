import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Random "mo:base/Random";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Constants "../Constants";
import Debug "mo:base/Debug";
import Result "mo:base/Result";
import Blob "mo:base/Blob";

actor ApiGateway {
  // HTTP Request/Response Types for CORS support
  public type HttpRequest = {
    method : Text;
    url : Text;
    headers : [(Text, Text)];
    body : Blob;
  };

  public type HttpResponse = {
    status_code : Nat16;
    headers : [(Text, Text)];
    body : Blob;
  };

  // Types for API Gateway
  public type ApiKey = {
    id : Text;
    key : Text;
    name : Text;
    permissions : [Permission];
    created_at : Nat64;
    last_used : ?Nat64;
    expires_at : ?Nat64;
    is_active : Bool;
    usage_count : Nat;
    rate_limit : Nat; // requests per minute
    created_by : Principal;
  };

  public type Permission = {
    #ReadTransactions;
    #ReadBalances;
    #ReadMembers;
    #ReadAnalytics;
    #ReadInventory;
    #ReadOrders;
    #Admin;
  };

  public type ApiKeyRequest = {
    name : Text;
    permissions : [Permission];
    expires_in_days : ?Nat;
    rate_limit : ?Nat;
  };

  public type TransactionData = {
    id : Nat;
    from : Principal;
    to : Principal;
    token : Text;
    amount : Nat;
    timestamp : Int;
    tx_type : Text;
    block_hash : ?Text;
    fee : ?Nat;
  };

  public type PaginatedTransactions = {
    transactions : [TransactionData];
    total_count : Nat;
    page : Nat;
    limit : Nat;
    has_next : Bool;
  };

  public type AnalyticsData = {
    total_transactions : Nat;
    total_volume : Nat;
    active_users : Nat;
    daily_transactions : Nat;
    timestamp : Nat64;
  };

  public type UserBalance = {
    user : Principal;
    token : Text;
    amount : Nat;
  };

  public type ApiResponse<T> = {
    #Ok : T;
    #Err : Text;
  };

  // Admin principals
  private let ADMIN_PRINCIPAL : Principal = Principal.fromText(Constants.ADMIN_PRINCIPAL_TEXT);
  private let ADMIN_OISY_PRINCIPAL : Principal = Principal.fromText(Constants.ADMIN_OISY_PRINCIPAL_TEXT);
  private let ADMIN_NFID_PRINCIPAL : Principal = Principal.fromText(Constants.ADMIN_NFID_PRINCIPAL_TEXT);
  private let ADMIN_NFID2_PRINCIPAL : Principal = Principal.fromText(Constants.ADMIN_NFID2_PRINCIPAL_TEXT);

  // Stable storage
  stable var apiKeysArr : [ApiKey] = [];
  stable var nextKeyId : Nat = 1;

  // Runtime storage
  var apiKeys : HashMap.HashMap<Text, ApiKey> = HashMap.HashMap<Text, ApiKey>(10, Text.equal, func(t : Text) : Nat32 { 0 });
  var keysByPrincipal : HashMap.HashMap<Principal, [Text]> = HashMap.HashMap<Principal, [Text]>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });

  // Rate limiting storage (key -> (minute, count))
  var rateLimits : HashMap.HashMap<Text, (Nat64, Nat)> = HashMap.HashMap<Text, (Nat64, Nat)>(10, Text.equal, func(t : Text) : Nat32 { 0 });

  // Initialize from stable storage
  private func initializeApiKeys() {
    for (key in apiKeysArr.vals()) {
      apiKeys.put(key.key, key);
      
      // Build index by principal
      switch (keysByPrincipal.get(key.created_by)) {
        case null { keysByPrincipal.put(key.created_by, [key.key]) };
        case (?existing) { keysByPrincipal.put(key.created_by, Array.append(existing, [key.key])) };
      };
    };
  };

  // Call initialization
  initializeApiKeys();

  // Helper functions
  private func isAdmin(caller : Principal) : Bool {
    Principal.equal(caller, ADMIN_PRINCIPAL) or
    Principal.equal(caller, ADMIN_OISY_PRINCIPAL) or
    Principal.equal(caller, ADMIN_NFID_PRINCIPAL) or
    Principal.equal(caller, ADMIN_NFID2_PRINCIPAL)
  };

  private func generateApiKey() : Text {
    let now = Nat64.fromIntWrap(Time.now());
    let random = now % 999999999;
    "icspicy_" # Nat.toText(nextKeyId) # "_" # Nat64.toText(random) # "_" # Nat64.toText(now / 1000000)
  };

  private func getCurrentMinute() : Nat64 {
    Nat64.fromIntWrap(Time.now() / 60_000_000_000) // Convert to minutes
  };

  private func checkRateLimit(apiKey : Text, limit : Nat) : Bool {
    let currentMinute = getCurrentMinute();
    
    switch (rateLimits.get(apiKey)) {
      case null {
        rateLimits.put(apiKey, (currentMinute, 1));
        true
      };
      case (?(minute, count)) {
        if (minute == currentMinute) {
          if (count >= limit) {
            false // Rate limit exceeded
          } else {
            rateLimits.put(apiKey, (minute, count + 1));
            true
          }
        } else {
          // New minute, reset counter
          rateLimits.put(apiKey, (currentMinute, 1));
          true
        }
      };
    }
  };

  private func hasPermission(apiKey : ApiKey, required : Permission) : Bool {
    Array.find<Permission>(apiKey.permissions, func(p) = p == required) != null or
    Array.find<Permission>(apiKey.permissions, func(p) = p == #Admin) != null
  };

  private func validateApiKey(key : Text, required : Permission) : ?ApiKey {
    switch (apiKeys.get(key)) {
      case null { null };
      case (?apiKey) {
        if (not apiKey.is_active) { return null };
        
        // Check expiration
        switch (apiKey.expires_at) {
          case (?expires) {
            let now = Nat64.fromIntWrap(Time.now() / 1_000_000_000);
            if (now > expires) { return null };
          };
          case null {};
        };
        
        // Check permissions
        if (not hasPermission(apiKey, required)) { return null };
        
        // Check rate limit
        if (not checkRateLimit(key, apiKey.rate_limit)) { return null };
        
        ?apiKey
      };
    }
  };

  private func updateKeyUsage(key : Text) {
    switch (apiKeys.get(key)) {
      case null {};
      case (?apiKey) {
        let updatedKey = {
          apiKey with
          last_used = ?Nat64.fromIntWrap(Time.now() / 1_000_000_000);
          usage_count = apiKey.usage_count + 1;
        };
        apiKeys.put(key, updatedKey);
      };
    }
  };

  // API Key Management Functions

  // Create new API key (Admin only)
  public shared ({ caller }) func createApiKey(request : ApiKeyRequest) : async ApiResponse<ApiKey> {
    if (not isAdmin(caller)) {
      return #Err("Unauthorized: Admin access required");
    };

    let now = Nat64.fromIntWrap(Time.now() / 1_000_000_000);
    let key = generateApiKey();
    let expires_at = switch (request.expires_in_days) {
      case null { null };
      case (?days) { ?(now + Nat64.fromNat(days * 24 * 60 * 60)) };
    };

    let apiKey : ApiKey = {
      id = Nat.toText(nextKeyId);
      key = key;
      name = request.name;
      permissions = request.permissions;
      created_at = now;
      last_used = null;
      expires_at = expires_at;
      is_active = true;
      usage_count = 0;
      rate_limit = switch (request.rate_limit) { case null { 100 }; case (?limit) { limit } };
      created_by = caller;
    };

    apiKeys.put(key, apiKey);
    
    // Update principal index
    switch (keysByPrincipal.get(caller)) {
      case null { keysByPrincipal.put(caller, [key]) };
      case (?existing) { keysByPrincipal.put(caller, Array.append(existing, [key])) };
    };

    nextKeyId += 1;

    #Ok(apiKey)
  };

  // List API keys for caller
  public shared ({ caller }) func listApiKeys() : async [ApiKey] {
    if (not isAdmin(caller)) { return [] };
    
    switch (keysByPrincipal.get(caller)) {
      case null { [] };
      case (?keys) {
        Array.mapFilter<Text, ApiKey>(keys, func(key) = apiKeys.get(key))
      };
    }
  };

  // Revoke API key
  public shared ({ caller }) func revokeApiKey(keyId : Text) : async Bool {
    if (not isAdmin(caller)) { return false };
    
    // Find key by ID
    let keyToRevoke = Array.find<ApiKey>(Iter.toArray(apiKeys.vals()), func(k) = k.id == keyId);
    
    switch (keyToRevoke) {
      case null { false };
      case (?key) {
        if (not Principal.equal(key.created_by, caller) and not isAdmin(caller)) {
          return false;
        };
        
        let updatedKey = { key with is_active = false };
        apiKeys.put(key.key, updatedKey);
        true
      };
    }
  };

  // Transaction Data API Endpoints

  // Get transaction history with pagination
  public shared query ({ caller }) func getTransactions(
    apiKey : Text,
    page : ?Nat,
    limit : ?Nat,
    user : ?Principal,
    token : ?Text,
    start_time : ?Int,
    end_time : ?Int
  ) : async ApiResponse<PaginatedTransactions> {
    
    switch (validateApiKey(apiKey, #ReadTransactions)) {
      case null { return #Err("Invalid or unauthorized API key") };
      case (?validKey) {
        // This would normally call the wallet canister
        // For now, return mock data structure
        let mockTransactions : [TransactionData] = [
          {
            id = 1;
            from = Principal.fromText("rdmx6-jaaaa-aaaaa-qaadq-cai");
            to = Principal.fromText("rrkah-fqaaa-aaaaa-qaadq-cai");
            token = "SPICY";
            amount = 1000;
            timestamp = Time.now();
            tx_type = "transfer";
            block_hash = ?"0x123...abc";
            fee = ?10;
          }
        ];

        #Ok({
          transactions = mockTransactions;
          total_count = 1;
          page = switch(page) { case null { 1 }; case (?p) { p } };
          limit = switch(limit) { case null { 20 }; case (?l) { l } };
          has_next = false;
        })
      };
    }
  };

  // Get analytics data
  public shared query func getAnalytics(apiKey : Text) : async ApiResponse<AnalyticsData> {
    switch (validateApiKey(apiKey, #ReadAnalytics)) {
      case null { return #Err("Invalid or unauthorized API key") };
      case (?validKey) {
        #Ok({
          total_transactions = 1250;
          total_volume = 50000;
          active_users = 342;
          daily_transactions = 85;
          timestamp = Nat64.fromIntWrap(Time.now() / 1_000_000_000);
        })
      };
    }
  };

  // Get user balances
  public shared query func getUserBalances(apiKey : Text, user : Principal) : async ApiResponse<[(Text, Nat)]> {
    switch (validateApiKey(apiKey, #ReadBalances)) {
      case null { return #Err("Invalid or unauthorized API key") };
      case (?validKey) {
        // Mock balance data
        #Ok([("SPICY", 1000), ("HEAT", 500)])
      };
    }
  };

  // API Key validation endpoint (for external services)
  public shared query func validateKey(apiKey : Text) : async Bool {
    switch (apiKeys.get(apiKey)) {
      case null { false };
      case (?key) {
        key.is_active and (
          switch (key.expires_at) {
            case null { true };
            case (?expires) {
              let now = Nat64.fromIntWrap(Time.now() / 1_000_000_000);
              now <= expires
            };
          }
        )
      };
    }
  };

  // Get API usage statistics
  public shared query ({ caller }) func getApiUsage(keyId : Text) : async ApiResponse<{usage_count : Nat; last_used : ?Nat64; rate_limit_remaining : Nat}> {
    if (not isAdmin(caller)) {
      return #Err("Unauthorized");
    };

    let key = Array.find<ApiKey>(Iter.toArray(apiKeys.vals()), func(k) = k.id == keyId);
    
    switch (key) {
      case null { #Err("API key not found") };
      case (?apiKey) {
        let currentMinute = getCurrentMinute();
        let remaining = switch (rateLimits.get(apiKey.key)) {
          case null { apiKey.rate_limit };
          case (?(minute, count)) {
            if (minute == currentMinute) {
              if (apiKey.rate_limit > count) { apiKey.rate_limit - count } else { 0 }
            } else {
              apiKey.rate_limit
            }
          };
        };

        #Ok({
          usage_count = apiKey.usage_count;
          last_used = apiKey.last_used;
          rate_limit_remaining = remaining;
        })
      };
    }
  };

  // HTTP Request Handler with CORS support
  public func http_request(req : HttpRequest) : async HttpResponse {
    let corsHeaders = [
      ("Access-Control-Allow-Origin", "*"),
      ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
      ("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key"),
      ("Access-Control-Max-Age", "86400"),
      ("Content-Type", "application/json")
    ];

    // Handle preflight OPTIONS requests
    if (req.method == "OPTIONS") {
      return {
        status_code = 200;
        headers = corsHeaders;
        body = Text.encodeUtf8("");
      };
    };

    // Parse the URL path to route requests
    let path = getUrlPath(req.url);
    
    // Extract API key from headers
    let apiKeyOpt = getApiKeyFromHeaders(req.headers);
    
    switch (apiKeyOpt) {
      case null {
        // API key missing
        return {
          status_code = 401;
          headers = corsHeaders;
          body = Text.encodeUtf8("{\"error\":\"Missing X-API-Key header\",\"code\":\"UNAUTHORIZED\"}");
        };
      };
      case (?apiKey) {
        // Route based on path and method
        switch (path) {
          case ("/api/v1/transactions") {
            if (req.method == "GET") {
              await handleGetTransactions(apiKey, req);
            } else {
              {
                status_code = 405;
                headers = corsHeaders;
                body = Text.encodeUtf8("{\"error\":\"Method not allowed\",\"allowed\":[\"GET\"]}");
              }
            }
          };
          case ("/api/v1/analytics") {
            if (req.method == "GET") {
              await handleGetAnalytics(apiKey, req);
            } else {
              {
                status_code = 405;
                headers = corsHeaders;
                body = Text.encodeUtf8("{\"error\":\"Method not allowed\",\"allowed\":[\"GET\"]}");
              }
            }
          };
          case ("/api/v1/balances") {
            if (req.method == "GET") {
              await handleGetBalances(apiKey, req);
            } else {
              {
                status_code = 405;
                headers = corsHeaders;
                body = Text.encodeUtf8("{\"error\":\"Method not allowed\",\"allowed\":[\"GET\"]}");
              }
            }
          };
          case ("/api/v1/health") {
            {
              status_code = 200;
              headers = corsHeaders;
              body = Text.encodeUtf8("{\"status\":\"healthy\",\"service\":\"IC SPICY API Gateway\",\"version\":\"1.0.0\",\"canister_id\":\"ycy5f-4aaaa-aaaao-a4prq-cai\"}");
            }
          };
          case (_) {
            {
              status_code = 404;
              headers = corsHeaders;
              body = Text.encodeUtf8("{\"error\":\"Endpoint not found\",\"available_endpoints\":[\"/api/v1/transactions\",\"/api/v1/analytics\",\"/api/v1/balances\",\"/api/v1/health\"]}");
            }
          };
        }
      };
    }
  };

  // Helper functions for HTTP handling
  private func getUrlPath(url : Text) : Text {
    switch (Text.split(url, #char '?').next()) {
      case null { url };
      case (?path) { path };
    }
  };

  private func getApiKeyFromHeaders(headers : [(Text, Text)]) : ?Text {
    for (header in headers.vals()) {
      if (Text.toLowercase(header.0) == "x-api-key") {
        return ?header.1;
      };
    };
    null
  };

  // HTTP endpoint handlers
  private func handleGetTransactions(apiKey : Text, req : HttpRequest) : async HttpResponse {
    let corsHeaders = [
      ("Access-Control-Allow-Origin", "*"),
      ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
      ("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key"),
      ("Content-Type", "application/json")
    ];

    switch (await getTransactions(apiKey, null, null, null, null, null, null)) {
      case (#Ok(data)) {
        {
          status_code = 200;
          headers = corsHeaders;
          body = Text.encodeUtf8(serializeTransactions(data.transactions));
        }
      };
      case (#Err(error)) {
        {
          status_code = 403;
          headers = corsHeaders;
          body = Text.encodeUtf8("{\"error\":\"" # error # "\",\"code\":\"FORBIDDEN\"}");
        }
      };
    }
  };

  private func handleGetAnalytics(apiKey : Text, req : HttpRequest) : async HttpResponse {
    let corsHeaders = [
      ("Access-Control-Allow-Origin", "*"),
      ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
      ("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key"),
      ("Content-Type", "application/json")
    ];

    switch (await getAnalytics(apiKey)) {
      case (#Ok(data)) {
        {
          status_code = 200;
          headers = corsHeaders;
          body = Text.encodeUtf8(serializeAnalytics(data));
        }
      };
      case (#Err(error)) {
        {
          status_code = 403;
          headers = corsHeaders;
          body = Text.encodeUtf8("{\"error\":\"" # error # "\",\"code\":\"FORBIDDEN\"}");
        }
      };
    }
  };

  private func handleGetBalances(apiKey : Text, req : HttpRequest) : async HttpResponse {
    let corsHeaders = [
      ("Access-Control-Allow-Origin", "*"),
      ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
      ("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key"),
      ("Content-Type", "application/json")
    ];

    // For balances, we need a specific user - let's return a sample response for now
    {
      status_code = 200;
      headers = corsHeaders;
      body = Text.encodeUtf8("{\"success\":true,\"data\":[],\"message\":\"User parameter required for balance queries\"}");
    }
  };

  // JSON serialization helpers
  private func serializeTransactions(data : [TransactionData]) : Text {
    let txsArray = Array.map<TransactionData, Text>(data, func(tx) {
      "{\"id\":" # Nat.toText(tx.id) # 
      ",\"from\":\"" # Principal.toText(tx.from) # "\"" #
      ",\"to\":\"" # Principal.toText(tx.to) # "\"" #
      ",\"amount\":" # Nat.toText(tx.amount) # 
      ",\"token\":\"" # tx.token # "\"" #
      ",\"timestamp\":" # Int.toText(tx.timestamp) #
      ",\"tx_type\":\"" # tx.tx_type # "\"}"
    });
    let txsJson = Text.join(",", txsArray.vals());
    "{\"success\":true,\"data\":[" # txsJson # "],\"total\":" # Nat.toText(data.size()) # "}"
  };

  private func serializeAnalytics(data : AnalyticsData) : Text {
    "{\"success\":true,\"data\":{" #
    "\"total_transactions\":" # Nat.toText(data.total_transactions) # "," #
    "\"total_volume\":" # Nat.toText(data.total_volume) # "," #
    "\"active_users\":" # Nat.toText(data.active_users) # "," #
    "\"daily_transactions\":" # Nat.toText(data.daily_transactions) # "," #
    "\"timestamp\":" # Nat64.toText(data.timestamp) #
    "}}"
  };

  private func serializeBalances(data : [UserBalance]) : Text {
    let balancesArray = Array.map<UserBalance, Text>(data, func(balance) {
      "{\"user\":\"" # Principal.toText(balance.user) # "\"" #
      ",\"token\":\"" # balance.token # "\"" #
      ",\"amount\":" # Nat.toText(balance.amount) # "}"
    });
    let balancesJson = Text.join(",", balancesArray.vals());
    "{\"success\":true,\"data\":[" # balancesJson # "],\"total\":" # Nat.toText(data.size()) # "}"
  };

  // System management

  // Stable memory management
  system func preupgrade() {
    apiKeysArr := Iter.toArray(apiKeys.vals());
  };

  system func postupgrade() {
    initializeApiKeys();
  };
}
