import axios from "axios";

const HEROES = (await axios.get("https://assets.deadlock-api.com/v2/heroes?language=english&only_active=true")).data;
const RANKS = (await axios.get("https://assets.deadlock-api.com/v2/ranks")).data;

const ALIASES = {
  "lady geist": ["geist"],
  "mo & krill": ["mo", "krill", "mo and krill", "kriller"],
  "the doorman": ["doorman"],
  "viscous": ["goo"],
  "grey talon": ["grey", "talon", "bird"]
};

export function getHeroId(name) {
  let alias = name;
  for (const [key, val] of Object.entries(ALIASES)) {
    if (val.includes(name.toLowerCase())) {
      alias = key;
      break;
    }
  }

  for (const hero of HEROES) {
    if (hero.name.toLowerCase() === alias.toLowerCase()) {
      return hero.id;
    }
  }
  return null;
}

export function heroName(id) {
  const hero = HEROES.find(h => h.id === id);
  return hero ? hero.name : null;
}

export function getPlayerNetworth9min(playerData) {
  for (const stat of playerData.stats) {
    if (stat.time_stamp_s === 540) {
      return stat.net_worth;
    }
  }
  return null;
}

// Returns lane partner, then opps 1 and 2
export function getLanePlayers(data, playerTeam, playerId, playerLane) {
  const ret = [];

  // partner
  for (const player of data.match_info.players) {
    if (player.team === playerTeam && player.assigned_lane === playerLane && player.account_id !== playerId) {
      ret.push(player);
      break;
    }
  }

  // opponents
  for (const player of data.match_info.players) {
    if (player.assigned_lane === playerLane && player.team !== playerTeam) {
      ret.push(player);
    }
  }

  return ret;
}

export function getPlayerLaneDiff(data, team, lane) {
  let teamNet = 0;
  let enemyNet = 0;

  for (const player of data.match_info.players) {
    if (player.assigned_lane === lane) {
      if (player.team === team) {
        teamNet += getPlayerNetworth9min(player);
      } else {
        enemyNet += getPlayerNetworth9min(player);
      }
    }
  }

  return Number(((teamNet - enemyNet) / 1000).toFixed(1));
}

export function getRankStr(num) {
  const tier = Math.floor(num / 10);
  const div = num % 10;
  return `${RANKS[tier].name} ${div}`;
}

export function getPlayerData(steamId, data) {
  for (const player of data.match_info.players) {
    if (player.account_id === steamId) {
      return player;
    }
  }
  return null;
}

export function getPlayerEndStats(matchDuration, playerData) {
  for (const stat of playerData.stats) {
    if (stat.time_stamp_s === matchDuration) {
      return stat;
    }
  }
  return null;
}

export class DigestLM {
  constructor(steamId, lmDetailed) {
    this.lmDetailed = lmDetailed;
    this.playerData = getPlayerData(steamId, lmDetailed);

    if (!this.playerData) {
      throw new Error("Player not found in match data");
    }

    this.lmId = lmDetailed.match_info.match_id;
    this.duration = lmDetailed.match_info.duration_s;
    this.playerTeam = this.playerData.team;
    this.victory = lmDetailed.match_info.winning_team === this.playerTeam;
    this.playerLane = this.playerData.assigned_lane;

    this.playerEndStats = getPlayerEndStats(this.duration, this.playerData);
    this.laneDiff = getPlayerLaneDiff(lmDetailed, this.playerData.team, this.playerData.assigned_lane);

    this.playerItems = this.playerData.items;

    this.playerTeamBadge = this.playerTeam === 0
      ? lmDetailed.match_info.average_badge_team0
      : lmDetailed.match_info.average_badge_team1;
    this.enemyTeamBadge = this.playerTeam === 1
      ? lmDetailed.match_info.average_badge_team0
      : lmDetailed.match_info.average_badge_team1;

    this.playerAccuracy = this.playerEndStats
      ? Number(((this.playerEndStats.shots_hit / (this.playerEndStats.shots_hit + this.playerEndStats.shots_missed)) * 100).toFixed(1))
      : 0;

    this.playerNw = this.playerEndStats?.net_worth ?? 0;
    this.playerDenies = this.playerEndStats?.denies ?? 0;
    this.playerLh = (this.playerEndStats?.creep_kills ?? 0) + (this.playerEndStats?.neutral_kills ?? 0);
    this.playerLvl = this.playerEndStats?.level ?? 0;
    this.playerObjDamage = this.playerEndStats?.boss_damage ?? 0;

    this.playerHero = this.playerData.hero_id;
    this.kills = this.playerData.kills;
    this.deaths = this.playerData.deaths;
    this.assists = this.playerData.assists;

    this.playerNw9 = getPlayerNetworth9min(this.playerData);
    this.laners = getLanePlayers(lmDetailed, this.playerTeam, steamId, this.playerLane);

    if (this.laners.length >= 3) {
      this.lanePartnerNw9 = getPlayerNetworth9min(this.laners[0]);
      this.lanePartnerHero = this.laners[0].hero_id;

      this.laneOpp0Nw9 = getPlayerNetworth9min(this.laners[1]);
      this.laneOpp1Nw9 = getPlayerNetworth9min(this.laners[2]);
      this.laneOpp0Hero = this.laners[1].hero_id;
      this.laneOpp1Hero = this.laners[2].hero_id;
    }
  }
}
