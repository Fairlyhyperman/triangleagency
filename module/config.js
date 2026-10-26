export const TA = {};

TA.ASCII = `

████████╗ █████╗ 
╚══██╔══╝██╔══██╗
   ██║   ███████║
   ██║   ██╔══██║
   ██║   ██║  ██║
   ╚═╝   ╚═╝  ╚═╝                

`;

TA.chatModifyTimeout = 10 * 60 * 1000; // 10 minutes

TA.aspects = {
   "anomaly": {
      "colorClass": "color-blue"
   },
   "reality": {
      "colorClass": "color-yellow"
   },
   "competency": {
      "colorClass": "color-red"
   }
};

TA.qualities = [
   "attentiveness",
   "duplicity",
   "dynamism",
   "empathy",
   "initiative",
   "persistence",
   "presence",
   "professionalism",
   "subtlety"
 ];

 TA.agencyRanks = {
   "trainee": {
      "name": "TA.Agency.Rank.trainee",
      "order": 0
   },
   "associate": {
      "name": "TA.Agency.Rank.associate",
      "order": 3
   },
   "snrassociate": {
      "name": "TA.Agency.Rank.snrassociate",
      "order": 6
   },
   "asstdirector": {
      "name": "TA.Agency.Rank.asstdirector",
      "order": 9
   },
   "director": {
      "name": "TA.Agency.Rank.director",
      "order": 12
   },
   "rgndirector": {
      "name": "TA.Agency.Rank.rgndirector",
      "order": 15
   },
   "vp": {
      "name": "TA.Agency.Rank.vp",
      "order": 18
   },
   "snrvp": {
      "name": "TA.Agency.Rank.snrvp",
      "order": 21
   },
   "execvp": {
      "name": "TA.Agency.Rank.execvp",
      "order": 24
   },
   "chair": {
      "name": "TA.Agency.Rank.chair",
      "order": 27
   },
 }

 TA.outcomes = {
   "success": {
      "name": "TA.Outcome.success.prefix",
      "image": "onsuccess.png",
      "order": 1
   },
   "spend3s": {
      "name": "TA.Outcome.spend3s.prefix",
      "image": "onbonus.png",
      "order": 2
   },
   "eachplus3": {
      "name": "TA.Outcome.eachplus3.prefix",
      "image": "onbonus.png",
      "order": 3
   },
   "triscendence": {
      "name": "TA.Outcome.triscendence.prefix",
      "image": "onbonus.png",
      "order": 6
   },
   "every3rd3": {
      "name": "TA.Outcome.every3rd3.prefix",
      "image": "onbonus.png",
      "order": 7
   },
   "sixplus3s": {
      "name": "TA.Outcome.sixplus3s.prefix",
      "image": "onbonus.png",
      "order": 8
   },
   "failure": {
      "name": "TA.Outcome.failure.prefix",
      "image": "onfailure.png",
      "order": 9
   },
},


TA.templates = {
   "track": {
      "id": "",
      "reference": "",
      "name": "",
      "description": "",
      "size": 0,
      "value": 0,
      "strikes": 0,
      "milestones": {}
    }
}

TA.playwallLists = {
   "aspects": {
      "undefined": "TA.Unconnected",
      "anomaly": "TYPES.Item.Anomaly",
      "reality": "TYPES.Item.Reality",
      "competency": "TYPES.Item.Competency",
      "agency": "TA.TheAgency"
   }
},


TA.playwall = {
   "anomaly": {
      "worklife": {
         1: "H4",
         2: "H3",
         5: "U2",
         7: "X2",
         11: "N1",
         13: "Q2",
         17: "L10",
         19: "G8",
         23: "A7"
      }
   },
   "reality": {
      "worklife": {
         1: "C4",
         4: "L11",
         8: "E2",
         10: "O4",
         14: "T6",
         16: "V2",
         20: "X3",
         22: "H5",
         26: "E3"
      }
   },
   "competency": {
      "worklife": {
         3: "A3",
         6: "D4",
         9: "G3",
         12: "J3",
         15: "N3",
         18: "Q3",
         21: "T3",
         24: "W8",
         27: "Y2"
      }
   }
}

TA.unraveling = {
   looseEnds: {
      0: {
         chaos: 0,
         weather: 0
      },
      11: {
         chaos: 5,
         weather: 1
      },
      22: {
         chaos: 10,
         weather: 2
      },
      33: {
         chaos: 15,
         weather: 3
      },
      44: {
         chaos: 20,
         weather: 4
      },
      55: {
         chaos: 25,
         weather: 5
      },
      66: {
         chaos: 0,
         weather: 0
      },
      77: {
         chaos: 0,
         weather: 0
      },
   }
}