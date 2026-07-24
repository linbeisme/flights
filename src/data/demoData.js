import { computeCPP } from "../api/flightApi.js";
import { PROGRAMS } from "./defaults.js";

const label = (id) => PROGRAMS.find((p) => p.id === id)?.label || id;

function row({ id, program, origin, destination, date, cabin, points, taxes, taxesCurrency = "USD", cash, carriers, depart, arrive, next = false, stops, connections = [], layovers = [], total, seats, flightNumbers, updatedAt = "2026-07-24T18:00:00Z" }) {
  const [dh, dm] = depart.split(":").map(Number);
  const [ah, am] = arrive.split(":").map(Number);
  return {
    id, program, programLabel: label(program), source: program, origin, destination, date, cabin,
    points, taxes, taxesOriginal: taxes, taxesCurrency, taxesCurrencySource: "demo-explicit", taxesUsd: taxesCurrency === "USD" ? taxes : null, cash, cashCurrency: "USD", cashSource: "demo", carriers, departMin: dh * 60 + dm,
    arriveMin: ah * 60 + am, departTime: depart, arriveTime: arrive, arrivesNextDay: next,
    stops, connections, layovers, totalMinutes: total, seats, flightNumbers,
    cpp: computeCPP(cash, taxesCurrency === "USD" ? taxes : null, points), cashMatchType: "demo-illustrative", availabilityUpdatedAt: updatedAt, demo: true,
  };
}

export const DEMO_ROUTES = [
  { id: "demo-lax-lhr", origin: "LAX", destination: "LHR", date: "2026-10-15", flex: 0 },
  { id: "demo-lax-cdg", origin: "LAX", destination: "CDG", date: "2026-10-17", flex: 0 },
  { id: "demo-lax-fco", origin: "LAX", destination: "FCO", date: "2026-10-19", flex: 0 },
  { id: "demo-tpe-nrt", origin: "TPE", destination: "NRT", date: "2026-11-05", flex: 0 },
  { id: "demo-tpe-icn", origin: "TPE", destination: "ICN", date: "2026-11-07", flex: 0 },
  { id: "demo-tpe-bkk", origin: "TPE", destination: "BKK", date: "2026-11-09", flex: 0 },
  { id: "demo-tpe-sin", origin: "TPE", destination: "SIN", date: "2026-11-11", flex: 0 },
];

export const DEMO_RESULTS = [
  row({ id:"LHR-UA-1", program:"united", origin:"LAX", destination:"LHR", date:"2026-10-15", cabin:"business", points:80000, taxes:6, cash:4150, carriers:["UA"], depart:"17:30", arrive:"12:00", next:true, stops:0, total:630, seats:2, flightNumbers:"UA 923" }),
  row({ id:"LHR-AC-1", program:"aeroplan", origin:"LAX", destination:"LHR", date:"2026-10-15", cabin:"business", points:70000, taxes:86, cash:4150, carriers:["AC"], depart:"11:20", arrive:"09:15", next:true, stops:1, connections:["YVR"], layovers:[125], total:775, seats:3, flightNumbers:"AC 551 / AC 860" }),
  row({ id:"LHR-VS-1", program:"virginatlantic", origin:"LAX", destination:"LHR", date:"2026-10-15", cabin:"business", points:67500, taxes:810, taxesCurrency:"GBP", cash:4150, carriers:["VS"], depart:"20:45", arrive:"15:10", next:true, stops:0, total:625, seats:2, flightNumbers:"VS 24" }),
  row({ id:"LHR-AA-1", program:"american", origin:"LAX", destination:"LHR", date:"2026-10-15", cabin:"business", points:85000, taxes:6, cash:4150, carriers:["AA"], depart:"18:05", arrive:"12:35", next:true, stops:0, total:630, seats:4, flightNumbers:"AA 134" }),
  row({ id:"CDG-FB-1", program:"flyingblue", origin:"LAX", destination:"CDG", date:"2026-10-17", cabin:"business", points:55000, taxes:230, taxesCurrency:"EUR", cash:3980, carriers:["AF"], depart:"15:25", arrive:"11:10", next:true, stops:0, total:645, seats:2, flightNumbers:"AF 23" }),
  row({ id:"CDG-UA-1", program:"united", origin:"LAX", destination:"CDG", date:"2026-10-17", cabin:"business", points:80000, taxes:54, cash:3980, carriers:["UA","LH"], depart:"14:10", arrive:"13:20", next:true, stops:1, connections:["FRA"], layovers:[110], total:790, seats:2, flightNumbers:"UA 8844 / LH 1028" }),
  row({ id:"CDG-DL-1", program:"delta", origin:"LAX", destination:"CDG", date:"2026-10-17", cabin:"business", points:165000, taxes:6, cash:3980, carriers:["DL"], depart:"16:50", arrive:"12:30", next:true, stops:0, total:640, seats:5, flightNumbers:"DL 290" }),
  row({ id:"FCO-AC-1", program:"aeroplan", origin:"LAX", destination:"FCO", date:"2026-10-19", cabin:"business", points:85000, taxes:118, cash:4320, carriers:["LX"], depart:"19:10", arrive:"19:00", next:true, stops:1, connections:["ZRH"], layovers:[95], total:830, seats:2, flightNumbers:"LX 41 / LX 1732" }),
  row({ id:"FCO-TK-1", program:"turkish", origin:"LAX", destination:"FCO", date:"2026-10-19", cabin:"business", points:65000, taxes:260, taxesCurrency:"EUR", cash:4320, carriers:["TK"], depart:"13:40", arrive:"09:55", next:true, stops:1, connections:["IST"], layovers:[175], total:855, seats:2, flightNumbers:"TK 10 / TK 1861" }),
  row({ id:"FCO-UA-1", program:"united", origin:"LAX", destination:"FCO", date:"2026-10-19", cabin:"business", points:88000, taxes:63, cash:4320, carriers:["UA","LH"], depart:"17:15", arrive:"18:05", next:true, stops:1, connections:["MUC"], layovers:[135], total:890, seats:3, flightNumbers:"UA 8861 / LH 1868" }),
  row({ id:"NRT-AC-1", program:"aeroplan", origin:"TPE", destination:"NRT", date:"2026-11-05", cabin:"business", points:25000, taxes:42, cash:720, carriers:["BR"], depart:"08:50", arrive:"13:10", stops:0, total:200, seats:2, flightNumbers:"BR 198" }),
  row({ id:"NRT-UA-1", program:"united", origin:"TPE", destination:"NRT", date:"2026-11-05", cabin:"business", points:30000, taxes:35, cash:720, carriers:["NH"], depart:"13:20", arrive:"17:30", stops:0, total:190, seats:4, flightNumbers:"NH 824" }),
  row({ id:"NRT-VS-1", program:"virginatlantic", origin:"TPE", destination:"NRT", date:"2026-11-05", cabin:"business", points:22500, taxes:8500, taxesCurrency:"JPY", cash:720, carriers:["NH"], depart:"13:20", arrive:"17:30", stops:0, total:190, seats:2, flightNumbers:"NH 824" }),
  row({ id:"ICN-DL-1", program:"delta", origin:"TPE", destination:"ICN", date:"2026-11-07", cabin:"economy", points:18000, taxes:28, cash:310, carriers:["KE"], depart:"07:40", arrive:"11:10", stops:0, total:150, seats:5, flightNumbers:"KE 186" }),
  row({ id:"ICN-UA-1", program:"united", origin:"TPE", destination:"ICN", date:"2026-11-07", cabin:"economy", points:20000, taxes:25, cash:310, carriers:["OZ"], depart:"13:15", arrive:"16:45", stops:0, total:150, seats:4, flightNumbers:"OZ 712" }),
  row({ id:"BKK-AC-1", program:"aeroplan", origin:"TPE", destination:"BKK", date:"2026-11-09", cabin:"business", points:30000, taxes:48, cash:940, carriers:["BR"], depart:"09:05", arrive:"12:05", stops:0, total:240, seats:2, flightNumbers:"BR 67" }),
  row({ id:"BKK-UA-1", program:"united", origin:"TPE", destination:"BKK", date:"2026-11-09", cabin:"business", points:35000, taxes:44, cash:940, carriers:["TG"], depart:"14:10", arrive:"17:15", stops:0, total:245, seats:3, flightNumbers:"TG 635" }),
  row({ id:"SIN-LM-1", program:"lifemiles", origin:"TPE", destination:"SIN", date:"2026-11-11", cabin:"business", points:36000, taxes:62, cash:1120, carriers:["SQ"], depart:"10:20", arrive:"15:05", stops:0, total:285, seats:2, flightNumbers:"SQ 877" }),
  row({ id:"SIN-AC-1", program:"aeroplan", origin:"TPE", destination:"SIN", date:"2026-11-11", cabin:"business", points:40000, taxes:49, cash:1120, carriers:["BR"], depart:"07:40", arrive:"12:20", stops:0, total:280, seats:3, flightNumbers:"BR 225" }),
  row({ id:"SIN-TK-1", program:"turkish", origin:"TPE", destination:"SIN", date:"2026-11-11", cabin:"business", points:30000, taxes:110, taxesCurrency:"SGD", cash:1120, carriers:["SQ"], depart:"17:35", arrive:"22:20", stops:0, total:285, seats:2, flightNumbers:"SQ 879" }),
];

export function getDemoResultsForRoutes(routes) {
  const keys = new Set(routes.map((r) => `${r.origin}-${r.destination}`));
  return DEMO_RESULTS.filter((r) => keys.has(`${r.origin}-${r.destination}`)).map((r) => ({ ...r }));
}
