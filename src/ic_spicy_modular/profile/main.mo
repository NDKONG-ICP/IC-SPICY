import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Order "mo:base/Order";
import Constants "../Constants";

actor {
  // User profile type
  public type UserProfile = {
    principal : Principal;
    username : Text;
    display_name : Text;
    bio : Text;
    avatar_url : ?Text;
    location : Text;
    join_date : Int;
    last_active : Int;
    level : Nat;
    experience : Nat;
    badges : [Text];
    achievements : [Text];
    social_links : [Text];
    preferences : [Text];
  };

  // Badge type
  public type Badge = {
    id : Text;
    name : Text;
    description : Text;
    icon : Text;
    rarity : Text; // "common", "uncommon", "rare", "epic", "legendary"
    category : Text; // "farming", "community", "achievement", "special"
    requirements : [Text];
  };

  // Achievement type
  public type Achievement = {
    id : Text;
    name : Text;
    description : Text;
    icon : Text;
    points : Nat;
    category : Text;
    unlocked_at : ?Int;
  };

  // Stable storage
  stable var profilesArr : [UserProfile] = [];
  stable var badgesArr : [Badge] = [];
  stable var achievementsArr : [Achievement] = [];

  // Non-stable HashMaps for fast lookup
  var profiles : HashMap.HashMap<Principal, UserProfile> = HashMap.HashMap<Principal, UserProfile>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
  var badges : HashMap.HashMap<Text, Badge> = HashMap.HashMap<Text, Badge>(10, Text.equal, func(t : Text) : Nat32 { 0 });
  var achievements : HashMap.HashMap<Text, Achievement> = HashMap.HashMap<Text, Achievement>(10, Text.equal, func(t : Text) : Nat32 { 0 });

  // Available badges
  let availableBadges : [Badge] = [
    {
      id = "first_harvest";
      name = "First Harvest";
      description = "Successfully harvested your first chili pepper";
      icon = "🌶️";
      rarity = "common";
      category = "farming";
      requirements = ["Harvest 1 chili pepper"];
    },
    {
      id = "chili_master";
      name = "Chili Master";
      description = "Grow 10 different varieties of chili peppers";
      icon = "👑";
      rarity = "rare";
      category = "farming";
      requirements = ["Grow 10 different chili varieties"];
    },
    {
      id = "community_leader";
      name = "Community Leader";
      description = "Help 50 other farmers with advice";
      icon = "🤝";
      rarity = "epic";
      category = "community";
      requirements = ["Help 50 farmers"];
    },
    {
      id = "heat_seeker";
      name = "Heat Seeker";
      description = "Grow the world's hottest peppers";
      icon = "🔥";
      rarity = "legendary";
      category = "achievement";
      requirements = ["Grow Carolina Reaper or Ghost Pepper"];
    },
    {
      id = "early_adopter";
      name = "Early Adopter";
      description = "One of the first 100 users of IC SPICY";
      icon = "⭐";
      rarity = "rare";
      category = "special";
      requirements = ["Join within first 100 users"];
    }
  ];

  // Available achievements
  let availableAchievements : [Achievement] = [
    {
      id = "harvest_100";
      name = "Century Harvester";
      description = "Harvest 100 chili peppers";
      icon = "📊";
      points = 100;
      category = "farming";
      unlocked_at = null;
    },
    {
      id = "variety_collector";
      name = "Variety Collector";
      description = "Grow 5 different chili varieties";
      icon = "🎨";
      points = 200;
      category = "farming";
      unlocked_at = null;
    },
    {
      id = "social_butterfly";
      name = "Social Butterfly";
      description = "Connect with 20 other farmers";
      icon = "🦋";
      points = 150;
      category = "community";
      unlocked_at = null;
    },
    {
      id = "knowledge_sharer";
      name = "Knowledge Sharer";
      description = "Share 25 farming tips";
      icon = "📚";
      points = 300;
      category = "community";
      unlocked_at = null;
    },
    {
      id = "weather_wizard";
      name = "Weather Wizard";
      description = "Use AI weather advice 50 times";
      icon = "🌤️";
      points = 250;
      category = "ai";
      unlocked_at = null;
    }
  ];

  // System functions for persistence
  system func preupgrade() {
    profilesArr := Iter.toArray(profiles.vals());
    badgesArr := availableBadges;
    achievementsArr := availableAchievements;
  };

  system func postupgrade() {
    profiles := HashMap.HashMap<Principal, UserProfile>(10, Principal.equal, func(p : Principal) : Nat32 { 0 });
    for (profile in profilesArr.vals()) {
      profiles.put(profile.principal, profile);
    };
    
    badges := HashMap.HashMap<Text, Badge>(10, Text.equal, func(t : Text) : Nat32 { 0 });
    for (badge in badgesArr.vals()) {
      badges.put(badge.id, badge);
    };
    
    achievements := HashMap.HashMap<Text, Achievement>(10, Text.equal, func(t : Text) : Nat32 { 0 });
    for (achievement in achievementsArr.vals()) {
      achievements.put(achievement.id, achievement);
    };
  };

  // Create or update user profile
  public shared ({ caller }) func createProfile(username : Text, display_name : Text, bio : Text, avatar_url : ?Text, location : Text, social_links : [Text], preferences : [Text]) : async Bool {
    let now = Int.abs(Time.now());
    
    let profile : UserProfile = {
      principal = caller;
      username = username;
      display_name = display_name;
      bio = bio;
      avatar_url = avatar_url;
      location = location;
      join_date = now;
      last_active = now;
      level = 1;
      experience = 0;
      badges = [];
      achievements = [];
      social_links = social_links;
      preferences = preferences;
    };
    
    profiles.put(caller, profile);
    true
  };

  // Get user profile
  public shared query func getProfile(user : Principal) : async ?UserProfile {
    profiles.get(user)
  };

  // Update profile
  public shared ({ caller }) func updateProfile(display_name : Text, bio : Text, avatar_url : ?Text, location : Text, social_links : [Text], preferences : [Text]) : async Bool {
    switch (profiles.get(caller)) {
      case null { false };
      case (?existingProfile) {
        let updatedProfile : UserProfile = {
          principal = caller;
          username = existingProfile.username;
          display_name = display_name;
          bio = bio;
          avatar_url = avatar_url;
          location = location;
          join_date = existingProfile.join_date;
          last_active = Int.abs(Time.now());
          level = existingProfile.level;
          experience = existingProfile.experience;
          badges = existingProfile.badges;
          achievements = existingProfile.achievements;
          social_links = social_links;
          preferences = preferences;
        };
        
        profiles.put(caller, updatedProfile);
        true
      };
    };
  };

  // Add experience points
  public shared ({ caller }) func addExperience(points : Nat) : async Bool {
    switch (profiles.get(caller)) {
      case null { false };
      case (?profile) {
        let newExperience = profile.experience + points;
        let newLevel = (newExperience / 100) + 1; // Level up every 100 XP
        
        let updatedProfile : UserProfile = {
          principal = caller;
          username = profile.username;
          display_name = profile.display_name;
          bio = profile.bio;
          avatar_url = profile.avatar_url;
          location = profile.location;
          join_date = profile.join_date;
          last_active = Int.abs(Time.now());
          level = newLevel;
          experience = newExperience;
          badges = profile.badges;
          achievements = profile.achievements;
          social_links = profile.social_links;
          preferences = profile.preferences;
        };
        
        profiles.put(caller, updatedProfile);
        true
      };
    };
  };

  // Award badge
  public shared ({ caller }) func awardBadge(badge_id : Text) : async Bool {
    switch (profiles.get(caller)) {
      case null { false };
      case (?profile) {
        if (Array.find<Text>(profile.badges, func b { b == badge_id }) != null) {
          return false; // Badge already awarded
        };
        
        let updatedProfile : UserProfile = {
          principal = caller;
          username = profile.username;
          display_name = profile.display_name;
          bio = profile.bio;
          avatar_url = profile.avatar_url;
          location = profile.location;
          join_date = profile.join_date;
          last_active = Int.abs(Time.now());
          level = profile.level;
          experience = profile.experience;
          badges = Array.append(profile.badges, [badge_id]);
          achievements = profile.achievements;
          social_links = profile.social_links;
          preferences = profile.preferences;
        };
        
        profiles.put(caller, updatedProfile);
        true
      };
    };
  };

  // Unlock achievement
  public shared ({ caller }) func unlockAchievement(achievement_id : Text) : async Bool {
    switch (profiles.get(caller)) {
      case null { false };
      case (?profile) {
        if (Array.find<Text>(profile.achievements, func a { a == achievement_id }) != null) {
          return false; // Achievement already unlocked
        };
        
        let updatedProfile : UserProfile = {
          principal = caller;
          username = profile.username;
          display_name = profile.display_name;
          bio = profile.bio;
          avatar_url = profile.avatar_url;
          location = profile.location;
          join_date = profile.join_date;
          last_active = Int.abs(Time.now());
          level = profile.level;
          experience = profile.experience;
          badges = profile.badges;
          achievements = Array.append(profile.achievements, [achievement_id]);
          social_links = profile.social_links;
          preferences = profile.preferences;
        };
        
        profiles.put(caller, updatedProfile);
        true
      };
    };
  };

  // Get all badges
  public shared query func getAllBadges() : async [Badge] {
    Iter.toArray(badges.vals())
  };

  // Get badge by ID
  public shared query func getBadge(badge_id : Text) : async ?Badge {
    badges.get(badge_id)
  };

  // Get all achievements
  public shared query func getAllAchievements() : async [Achievement] {
    Iter.toArray(achievements.vals())
  };

  // Get achievement by ID
  public shared query func getAchievement(achievement_id : Text) : async ?Achievement {
    achievements.get(achievement_id)
  };

  // Get user's badges
  public shared query func getUserBadges(user : Principal) : async [Badge] {
    switch (profiles.get(user)) {
      case null { [] };
      case (?profile) {
        var userBadges : [Badge] = [];
        for (badgeId in profile.badges.vals()) {
          switch (badges.get(badgeId)) {
            case null { };
            case (?badge) { userBadges := Array.append(userBadges, [badge]) };
          };
        };
        userBadges
      };
    };
  };

  // Get user's achievements
  public shared query func getUserAchievements(user : Principal) : async [Achievement] {
    switch (profiles.get(user)) {
      case null { [] };
      case (?profile) {
        var userAchievements : [Achievement] = [];
        for (achievementId in profile.achievements.vals()) {
          switch (achievements.get(achievementId)) {
            case null { };
            case (?achievement) { userAchievements := Array.append(userAchievements, [achievement]) };
          };
        };
        userAchievements
      };
    };
  };

  // Get leaderboard
  public shared query func getLeaderboard() : async [UserProfile] {
    let allProfiles = Iter.toArray(profiles.vals());
    // Sort by experience in descending order
    Array.sort<UserProfile>(allProfiles, func(a, b) { 
      if (a.experience > b.experience) { #greater } else if (a.experience < b.experience) { #less } else { #equal }
    })
  };

  // Get profile statistics
  public shared query func getProfileStats() : async { total_users : Nat; total_badges : Nat; total_achievements : Nat; avg_level : Float } {
    let total_users = profiles.size();
    let total_badges = badges.size();
    let total_achievements = achievements.size();
    
    let allProfiles = Iter.toArray(profiles.vals());
    let totalLevel = Array.foldLeft<UserProfile, Nat>(allProfiles, 0, func(acc, profile) { acc + profile.level });
    let avgLevel = if (total_users > 0) { Float.fromInt(totalLevel) / Float.fromInt(total_users) } else { 0.0 };
    
    { total_users = total_users; total_badges = total_badges; total_achievements = total_achievements; avg_level = avgLevel }
  };
} 