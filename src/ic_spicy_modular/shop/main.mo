import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Constants "../Constants";

actor {
  // Product type
  public type Product = {
    id : Nat;
    name : Text;
    price : Nat;
    icon : Text;
    stock : Nat;
    description : Text;
    rarity : Text;
    category : Text;
    image_url : ?Text;
  };

  // Purchase record
  public type Purchase = {
    id : Nat;
    user : Principal;
    product_id : Nat;
    product_name : Text;
    price : Nat;
    purchased_at : Int;
    redeemed : Bool;
    redeemed_at : ?Int;
  };

  // Stable storage
  stable var productsArr : [Product] = [];
  stable var purchasesArr : [Purchase] = [];
  stable var nextProductId : Nat = 1;
  stable var nextPurchaseId : Nat = 1;

  // Non-stable HashMaps for fast lookup
  var products : HashMap.HashMap<Nat, Product> = HashMap.HashMap<Nat, Product>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n) });
  var purchases : HashMap.HashMap<Principal, [Purchase]> = HashMap.HashMap<Principal, [Purchase]>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });

  // Initialize with default products
  let defaultProducts : [Product] = [
    { id = 1; name = "MOA Scotch Bonnet NFT"; price = 45; icon = "🌶️"; stock = 25; description = "Variety-specific NFT, redeemable for shaker spices, stakeable for HEAT tokens."; rarity = "rare"; category = "nft"; image_url = null },
    { id = 2; name = "Carolina Reaper NFT"; price = 55; icon = "🔥"; stock = 15; description = "Premium variety NFT with exclusive staking rewards and spice redemption."; rarity = "epic"; category = "nft"; image_url = null },
    { id = 3; name = "Gourmet Salt Blend NFT"; price = 35; icon = "🧂"; stock = 30; description = "Smoked salt blend NFT, redeemable for premium seasoning products."; rarity = "uncommon"; category = "nft"; image_url = null },
    { id = 4; name = "Plumeria Seedling NFT"; price = 25; icon = "🌸"; stock = 20; description = "Ornamental seedling NFT with growth tracking and community features."; rarity = "common"; category = "nft"; image_url = null },
    { id = 5; name = "Hydroponic Kit NFT"; price = 198; icon = "🪴"; stock = 5000; description = "20-plant hydroponic kit for co-op members with AI assistance."; rarity = "legendary"; category = "nft"; image_url = null },
    { id = 6; name = "SPICY Token Bundle"; price = 100; icon = "💰"; stock = 500; description = "SPICY token bundle for staking and governance participation."; rarity = "rare"; category = "token"; image_url = null },
  ];

  // System functions for persistence
  system func preupgrade() {
    productsArr := Iter.toArray(products.vals());
    purchasesArr := Array.flatten<Purchase>(Iter.toArray(purchases.vals()));
  };

  system func postupgrade() {
    products := HashMap.HashMap<Nat, Product>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n) });
    for (p in productsArr.vals()) {
      products.put(p.id, p);
    };
    
    purchases := HashMap.HashMap<Principal, [Purchase]>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
    for (purchase in purchasesArr.vals()) {
      switch (purchases.get(purchase.user)) {
        case null { purchases.put(purchase.user, [purchase]) };
        case (?userPurchases) { purchases.put(purchase.user, Array.append(userPurchases, [purchase])) };
      };
    };
  };

  // Initialize products if empty
  private func initializeProducts() {
    if (products.size() == 0) {
      for (product in defaultProducts.vals()) {
        products.put(product.id, product);
      };
      nextProductId := defaultProducts.size() + 1;
    };
  };

  // Get all available products
  public shared query func getAvailableProducts() : async [Product] {
    Iter.toArray(products.vals())
  };

  // Get product by ID
  public shared query func getProduct(id : Nat) : async ?Product {
    products.get(id)
  };

  // Add new product (admin only)
  public shared ({ caller }) func addProduct(name : Text, price : Nat, icon : Text, stock : Nat, description : Text, rarity : Text, category : Text, image_url : ?Text) : async Nat {
    // Check if caller is admin
    if (not Principal.equal(caller, Principal.fromText(Constants.ADMIN_PRINCIPAL_TEXT))) {
      return 0;
    };
    
    let newProduct : Product = {
      id = nextProductId;
      name = name;
      price = price;
      icon = icon;
      stock = stock;
      description = description;
      rarity = rarity;
      category = category;
      image_url = image_url;
    };
    
    products.put(nextProductId, newProduct);
    nextProductId += 1;
    newProduct.id
  };

  // Purchase product
  public shared ({ caller }) func purchaseProduct(user : Principal, product_id : Nat, price : Nat) : async Bool {
    switch (products.get(product_id)) {
      case null { false };
      case (?product) {
        if (product.price != price) { return false };
        if (product.stock == 0) { return false };
        
        // Create purchase record
        let purchase : Purchase = {
          id = nextPurchaseId;
          user = user;
          product_id = product_id;
          product_name = product.name;
          price = price;
          purchased_at = Int.abs(Time.now());
          redeemed = false;
          redeemed_at = null;
        };
        
        // Update stock
        let updatedProduct : Product = {
          id = product.id;
          name = product.name;
          price = product.price;
          icon = product.icon;
          stock = product.stock - 1;
          description = product.description;
          rarity = product.rarity;
          category = product.category;
          image_url = product.image_url;
        };
        
        products.put(product_id, updatedProduct);
        
        // Add to user's purchases
        switch (purchases.get(user)) {
          case null { purchases.put(user, [purchase]) };
          case (?userPurchases) { purchases.put(user, Array.append(userPurchases, [purchase])) };
        };
        
        nextPurchaseId += 1;
        true
      };
    };
  };

  // Get user's purchases
  public shared query func getUserPurchases(user : Principal) : async [Purchase] {
    switch (purchases.get(user)) {
      case null { [] };
      case (?userPurchases) { userPurchases };
    };
  };

  // Redeem NFT
  public shared ({ caller }) func redeemNFT(user : Principal, purchase_id : Nat) : async Bool {
    switch (purchases.get(user)) {
      case null { false };
      case (?userPurchases) {
        let userPurchase = Array.find<Purchase>(userPurchases, func p { p.id == purchase_id });
        switch (userPurchase) {
          case null { false };
          case (?purchase) {
            if (purchase.redeemed) { return false };
            
            let redeemedPurchase : Purchase = {
              id = purchase.id;
              user = purchase.user;
              product_id = purchase.product_id;
              product_name = purchase.product_name;
              price = purchase.price;
              purchased_at = purchase.purchased_at;
              redeemed = true;
              redeemed_at = ?Int.abs(Time.now());
            };
            
            let updatedPurchases = Array.map<Purchase, Purchase>(userPurchases, func p { 
              if (p.id == purchase_id) { redeemedPurchase } else { p }
            });
            
            purchases.put(user, updatedPurchases);
            true
          };
        };
      };
    };
  };

  // Update product stock
  public shared ({ caller }) func updateProductStock(product_id : Nat, new_stock : Nat) : async Bool {
    if (not Principal.equal(caller, Principal.fromText(Constants.ADMIN_PRINCIPAL_TEXT))) {
      return false;
    };
    
    switch (products.get(product_id)) {
      case null { false };
      case (?product) {
        let updatedProduct : Product = {
          id = product.id;
          name = product.name;
          price = product.price;
          icon = product.icon;
          stock = new_stock;
          description = product.description;
          rarity = product.rarity;
          category = product.category;
          image_url = product.image_url;
        };
        
        products.put(product_id, updatedProduct);
        true
      };
    };
  };

  // Get shop statistics
  public shared query func getShopStats() : async { total_products : Nat; total_purchases : Nat; total_revenue : Nat } {
    let total_products = products.size();
    let total_purchases = purchasesArr.size();
    let total_revenue = Array.foldLeft<Purchase, Nat>(purchasesArr, 0, func(acc, purchase) { acc + purchase.price });
    { total_products = total_products; total_purchases = total_purchases; total_revenue = total_revenue }
  };
} 