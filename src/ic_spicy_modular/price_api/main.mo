import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Nat16 "mo:base/Nat16";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import JSON "mo:base/JSON";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Result "mo:base/Result";

actor PriceAPI {
    // Types
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

    // Price cache
    private var priceCache = HashMap.HashMap<Text, (Float, Nat)>(10, Text.equal, Text.hash);
    private let CACHE_DURATION = 60_000_000_000; // 60 seconds in nanoseconds

    // Supported tokens
    private let supportedTokens = [
        ("ICP", "internet-computer"),
        ("BTC", "bitcoin"),
        ("ETH", "ethereum"),
        ("SOL", "solana"),
        ("USDC", "usd-coin"),
        ("USDT", "tether"),
        ("CRO", "crypto-com-chain"),
        ("MATIC", "matic-network"),
        ("BNB", "binancecoin")
    ];

    // CORS headers
    private let corsHeaders = [
        ("Access-Control-Allow-Origin", "*"),
        ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
        ("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key"),
        ("Access-Control-Max-Age", "86400"),
        ("Content-Type", "application/json")
    ];

    // HTTP request handler
    public func http_request(req : HttpRequest) : async HttpResponse {
        // Handle CORS preflight
        if (req.method == "OPTIONS") {
            return {
                status_code = 200;
                headers = corsHeaders;
                body = Text.encodeUtf8("");
            };
        };

        let path = getUrlPath(req.url);
        
        switch (path) {
            case ("/api/v1/prices") {
                return await handleGetPrices();
            };
            case ("/api/v1/prices/" # token) {
                let token = extractTokenFromPath(req.url);
                return await handleGetTokenPrice(token);
            };
            case ("/api/v1/health") {
                return {
                    status_code = 200;
                    headers = corsHeaders;
                    body = Text.encodeUtf8("{\"status\":\"healthy\",\"service\":\"IC SPICY Price API\",\"version\":\"1.0.0\"}");
                };
            };
            case (_) {
                return {
                    status_code = 404;
                    headers = corsHeaders;
                    body = Text.encodeUtf8("{\"error\":\"Endpoint not found\",\"available_endpoints\":[\"/api/v1/prices\",\"/api/v1/prices/{token}\",\"/api/v1/health\"]}");
                };
            };
        };
    };

    // Get all prices
    private func handleGetPrices() : async HttpResponse {
        let prices = await fetchAllPrices();
        let json = switch (JSON.toText(prices)) {
            case (#ok(text)) text;
            case (#err(_)) "{\"error\":\"Failed to serialize prices\"}";
        };
        
        return {
            status_code = 200;
            headers = corsHeaders;
            body = Text.encodeUtf8(json);
        };
    };

    // Get specific token price
    private func handleGetTokenPrice(token : Text) : async HttpResponse {
        let price = await fetchTokenPrice(token);
        let json = switch (JSON.toText(price)) {
            case (#ok(text)) text;
            case (#err(_)) "{\"error\":\"Failed to serialize price\"}";
        };
        
        return {
            status_code = 200;
            headers = corsHeaders;
            body = Text.encodeUtf8(json);
        };
    };

    // Fetch all prices
    private func fetchAllPrices() : async JSON.JSON {
        let prices = Buffer.Buffer<(Text, Float)>(supportedTokens.size());
        
        for ((symbol, coingeckoId) in supportedTokens.vals()) {
            let price = await getCachedPrice(symbol, coingeckoId);
            prices.add((symbol, price));
        };
        
        let priceArray = Array.map<(Text, Float), JSON.JSON>(
            prices.toArray(),
            func((symbol, price)) = #Object([
                ("symbol", #String(symbol)),
                ("price", #Number(price))
            ])
        );
        
        return #Object([
            ("prices", #Array(priceArray)),
            ("timestamp", #Number(Float.fromInt(Time.now())))
        ]);
    };

    // Fetch specific token price
    private func fetchTokenPrice(token : Text) : async JSON.JSON {
        let upperToken = Text.map(token, func(c) = if (c >= 'a' and c <= 'z') c - 32 else c);
        
        switch (Array.find<(Text, Text)>(supportedTokens, func((symbol, _)) = symbol == upperToken)) {
            case (null) {
                return #Object([
                    ("error", #String("Token not supported")),
                    ("supported_tokens", #Array(Array.map<(Text, Text), JSON.JSON>(supportedTokens, func((symbol, _)) = #String(symbol))))
                ]);
            };
            case (?((symbol, coingeckoId))) {
                let price = await getCachedPrice(symbol, coingeckoId);
                return #Object([
                    ("symbol", #String(symbol)),
                    ("price", #Number(price)),
                    ("timestamp", #Number(Float.fromInt(Time.now())))
                ]);
            };
        };
    };

    // Get cached price or fetch new one
    private func getCachedPrice(symbol : Text, coingeckoId : Text) : async Float {
        let now = Time.now();
        
        switch (priceCache.get(symbol)) {
            case (null) {
                // No cached price, fetch new one
                let price = await fetchPriceFromCoinGecko(coingeckoId);
                priceCache.put(symbol, (price, now));
                return price;
            };
            case (?(cachedPrice, timestamp)) {
                if (now - timestamp > CACHE_DURATION) {
                    // Cache expired, fetch new price
                    let price = await fetchPriceFromCoinGecko(coingeckoId);
                    priceCache.put(symbol, (price, now));
                    return price;
                } else {
                    // Use cached price
                    return cachedPrice;
                };
            };
        };
    };

    // Fetch price from CoinGecko (simplified - in production you'd use HTTP outcall)
    private func fetchPriceFromCoinGecko(coingeckoId : Text) : async Float {
        // For now, return fallback prices
        // In production, you would use HTTP outcalls to fetch real prices
        switch (coingeckoId) {
            case ("internet-computer") 12.50;
            case ("bitcoin") 95000.0;
            case ("ethereum") 3500.0;
            case ("solana") 200.0;
            case ("usd-coin") 1.0;
            case ("tether") 1.0;
            case ("crypto-com-chain") 0.15;
            case ("matic-network") 0.85;
            case ("binancecoin") 600.0;
            case (_) 1.0;
        };
    };

    // Helper functions
    private func getUrlPath(url : Text) : Text {
        switch (Text.split(url, #char '?')) {
            case (#ok(path, _)) path;
            case (#err(_)) url;
        };
    };

    private func extractTokenFromPath(url : Text) : Text {
        let path = getUrlPath(url);
        let parts = Text.split(path, #char '/');
        var token = "";
        var count = 0;
        
        for (part in parts) {
            if (count == 3) { // /api/v1/prices/{token}
                token := part;
                break;
            };
            count += 1;
        };
        
        token;
    };
}

