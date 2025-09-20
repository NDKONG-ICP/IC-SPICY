import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Constants "../Constants";

actor {
  // Chili NFT type
  public type ChiliNFT = {
    id : Nat;
    name : Text;
    variety : Text;
    heat_level : Nat; // SHU (Scoville Heat Units)
    rarity : Text; // "common", "uncommon", "rare", "epic", "legendary"
    owner : Principal;
    minted_at : Int;
    image_url : ?Text;
    description : Text;
    attributes : [Text]; // ["organic", "heirloom", "award-winning", etc.]
  };

  // Chili variety type
  public type ChiliVariety = {
    name : Text;
    shu : Nat;
    origin : Text;
    flavor_profile : Text;
    growing_difficulty : Text;
    days_to_maturity : Nat;
    plant_height : Text;
    fruit_size : Text;
  };

  // Chili fact type
  public type ChiliFact = {
    id : Nat;
    title : Text;
    fact : Text;
    category : Text; // "history", "science", "culinary", "health"
    source : Text;
    timestamp : Int;
  };

  // Stable storage
  stable var chiliNFTsArr : [ChiliNFT] = [];
  stable var chiliFactsArr : [ChiliFact] = [];
  stable var nextNFTId : Nat = 1;
  stable var nextFactId : Nat = 1;

  // Non-stable HashMaps for fast lookup
  var chiliNFTs : HashMap.HashMap<Principal, [ChiliNFT]> = HashMap.HashMap<Principal, [ChiliNFT]>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
  var allNFTs : HashMap.HashMap<Nat, ChiliNFT> = HashMap.HashMap<Nat, ChiliNFT>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n) });

  // Chili varieties database
  let chiliVarieties : [ChiliVariety] = [
    {
      name = "Jalapeño";
      shu = 2500;
      origin = "Mexico";
      flavor_profile = "Bright, grassy, slightly sweet";
      growing_difficulty = "Easy";
      days_to_maturity = 75;
      plant_height = "2-3 feet";
      fruit_size = "2-3 inches";
    },
    {
      name = "Habanero";
      shu = 350000;
      origin = "Amazon Basin";
      flavor_profile = "Fruity, citrusy, intensely hot";
      growing_difficulty = "Medium";
      days_to_maturity = 90;
      plant_height = "3-4 feet";
      fruit_size = "1-2 inches";
    },
    {
      name = "Ghost Pepper";
      shu = 1000000;
      origin = "India";
      flavor_profile = "Earthy, smoky, extremely hot";
      growing_difficulty = "Hard";
      days_to_maturity = 120;
      plant_height = "4-5 feet";
      fruit_size = "2-3 inches";
    },
    {
      name = "Carolina Reaper";
      shu = 2200000;
      origin = "South Carolina, USA";
      flavor_profile = "Fruity, sweet, then extremely hot";
      growing_difficulty = "Expert";
      days_to_maturity = 150;
      plant_height = "4-5 feet";
      fruit_size = "2-3 inches";
    },
    {
      name = "Serrano";
      shu = 10000;
      origin = "Mexico";
      flavor_profile = "Bright, crisp, medium heat";
      growing_difficulty = "Easy";
      days_to_maturity = 80;
      plant_height = "2-3 feet";
      fruit_size = "1-2 inches";
    },
    {
      name = "Bell Pepper";
      shu = 0;
      origin = "Central America";
      flavor_profile = "Sweet, mild, crunchy";
      growing_difficulty = "Easy";
      days_to_maturity = 70;
      plant_height = "2-3 feet";
      fruit_size = "3-4 inches";
    },
    {
      name = "Cayenne";
      shu = 50000;
      origin = "French Guiana";
      flavor_profile = "Sharp, hot, slightly bitter";
      growing_difficulty = "Easy";
      days_to_maturity = 85;
      plant_height = "2-3 feet";
      fruit_size = "4-6 inches";
    },
    {
      name = "Thai Bird's Eye";
      shu = 100000;
      origin = "Thailand";
      flavor_profile = "Sharp, hot, citrusy";
      growing_difficulty = "Medium";
      days_to_maturity = 90;
      plant_height = "2-3 feet";
      fruit_size = "1 inch";
    }
  ];

  // Initial chili facts
  let initialFacts : [ChiliFact] = [
    {
      id = 1;
      title = "The Scoville Scale";
      fact = "The Scoville scale measures the heat of chili peppers in Scoville Heat Units (SHU). It was created by pharmacist Wilbur Scoville in 1912.";
      category = "science";
      source = "Scoville Scale History";
      timestamp = Int.abs(Time.now());
    },
    {
      id = 2;
      title = "Chili Pepper Origins";
      fact = "Chili peppers originated in the Americas and were domesticated over 6,000 years ago. They were introduced to Europe by Christopher Columbus.";
      category = "history";
      source = "Archaeological Studies";
      timestamp = Int.abs(Time.now());
    },
    {
      id = 3;
      title = "Capsaicin Benefits";
      fact = "Capsaicin, the compound that makes peppers hot, has been shown to have anti-inflammatory properties and may help with pain relief.";
      category = "health";
      source = "Medical Research";
      timestamp = Int.abs(Time.now());
    },
    {
      id = 4;
      title = "World's Hottest Pepper";
      fact = "The Carolina Reaper holds the Guinness World Record for the hottest chili pepper, averaging 1,641,183 SHU.";
      category = "science";
      source = "Guinness World Records";
      timestamp = Int.abs(Time.now());
    },
    {
      id = 5;
      title = "Chili Pepper Varieties";
      fact = "There are over 4,000 varieties of chili peppers worldwide, ranging from sweet bell peppers to extremely hot varieties.";
      category = "science";
      source = "Botanical Studies";
      timestamp = Int.abs(Time.now());
    }
  ];

  // System functions for persistence
  system func preupgrade() {
    chiliNFTsArr := Array.flatten<ChiliNFT>(Iter.toArray(chiliNFTs.vals()));
    chiliFactsArr := initialFacts;
  };

  system func postupgrade() {
    chiliNFTs := HashMap.HashMap<Principal, [ChiliNFT]>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
    allNFTs := HashMap.HashMap<Nat, ChiliNFT>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n) });
    
    for (nft in chiliNFTsArr.vals()) {
      // Add to user's NFTs
      switch (chiliNFTs.get(nft.owner)) {
        case null { chiliNFTs.put(nft.owner, [nft]) };
        case (?userNFTs) { chiliNFTs.put(nft.owner, Array.append(userNFTs, [nft])) };
      };
      
      // Add to all NFTs
      allNFTs.put(nft.id, nft);
    };
  };

  // Get all chili varieties
  public shared query func getChiliVarieties() : async [ChiliVariety] {
    chiliVarieties
  };

  // Get chili variety by name
  public shared query func getChiliVariety(name : Text) : async ?ChiliVariety {
    Array.find<ChiliVariety>(chiliVarieties, func variety { variety.name == name })
  };

  // Get all chili facts
  public shared query func getChiliFacts() : async [ChiliFact] {
    chiliFactsArr
  };

  // Add new chili fact (admin only)
  public shared ({ caller }) func addChiliFact(title : Text, fact : Text, category : Text, source : Text) : async Nat {
    if (not Principal.equal(caller, Principal.fromText(Constants.ADMIN_PRINCIPAL_TEXT))) {
      return 0;
    };
    
    let newFact : ChiliFact = {
      id = nextFactId;
      title = title;
      fact = fact;
      category = category;
      source = source;
      timestamp = Int.abs(Time.now());
    };
    
    chiliFactsArr := Array.append(chiliFactsArr, [newFact]);
    nextFactId += 1;
    newFact.id
  };

  // Mint a new chili NFT
  public shared ({ caller }) func mintChiliNFT(name : Text, variety : Text, heat_level : Nat, rarity : Text, description : Text, image_url : ?Text, attributes : [Text]) : async Nat {
    let newNFT : ChiliNFT = {
      id = nextNFTId;
      name = name;
      variety = variety;
      heat_level = heat_level;
      rarity = rarity;
      owner = caller;
      minted_at = Int.abs(Time.now());
      image_url = image_url;
      description = description;
      attributes = attributes;
    };
    
    // Add to user's NFTs
    switch (chiliNFTs.get(caller)) {
      case null { chiliNFTs.put(caller, [newNFT]) };
      case (?userNFTs) { chiliNFTs.put(caller, Array.append(userNFTs, [newNFT])) };
    };
    
    // Add to all NFTs
    allNFTs.put(nextNFTId, newNFT);
    
    nextNFTId += 1;
    newNFT.id
  };

  // Get user's chili NFTs
  public shared query func getUserChiliNFTs(user : Principal) : async [ChiliNFT] {
    switch (chiliNFTs.get(user)) {
      case null { [] };
      case (?userNFTs) { userNFTs };
    };
  };

  // Get all chili NFTs
  public shared query func getAllChiliNFTs() : async [ChiliNFT] {
    Iter.toArray(allNFTs.vals())
  };

  // Get chili NFT by ID
  public shared query func getChiliNFT(id : Nat) : async ?ChiliNFT {
    allNFTs.get(id)
  };

  // Transfer chili NFT
  public shared ({ caller }) func transferChiliNFT(nft_id : Nat, to : Principal) : async Bool {
    switch (allNFTs.get(nft_id)) {
      case null { false };
      case (?nft) {
        if (not Principal.equal(nft.owner, caller)) {
          return false;
        };
        
        let updatedNFT : ChiliNFT = {
          id = nft.id;
          name = nft.name;
          variety = nft.variety;
          heat_level = nft.heat_level;
          rarity = nft.rarity;
          owner = to;
          minted_at = nft.minted_at;
          image_url = nft.image_url;
          description = nft.description;
          attributes = nft.attributes;
        };
        
        // Remove from current owner
        switch (chiliNFTs.get(caller)) {
          case null { };
          case (?userNFTs) {
            let filteredNFTs = Array.filter<ChiliNFT>(userNFTs, func n { n.id != nft_id });
            chiliNFTs.put(caller, filteredNFTs);
          };
        };
        
        // Add to new owner
        switch (chiliNFTs.get(to)) {
          case null { chiliNFTs.put(to, [updatedNFT]) };
          case (?userNFTs) { chiliNFTs.put(to, Array.append(userNFTs, [updatedNFT])) };
        };
        
        // Update all NFTs
        allNFTs.put(nft_id, updatedNFT);
        true
      };
    };
  };

  // Get chili statistics
  public shared query func getChiliStats() : async { total_nfts : Nat; total_varieties : Nat; total_facts : Nat; total_owners : Nat } {
    let total_nfts = allNFTs.size();
    let total_varieties = chiliVarieties.size();
    let total_facts = chiliFactsArr.size();
    let total_owners = chiliNFTs.size();
    { total_nfts = total_nfts; total_varieties = total_varieties; total_facts = total_facts; total_owners = total_owners }
  };

  // Get NFTs by rarity
  public shared query func getNFTsByRarity(rarity : Text) : async [ChiliNFT] {
    Array.filter<ChiliNFT>(Iter.toArray(allNFTs.vals()), func nft { nft.rarity == rarity })
  };

  // Get NFTs by variety
  public shared query func getNFTsByVariety(variety : Text) : async [ChiliNFT] {
    Array.filter<ChiliNFT>(Iter.toArray(allNFTs.vals()), func nft { nft.variety == variety })
  };
} 