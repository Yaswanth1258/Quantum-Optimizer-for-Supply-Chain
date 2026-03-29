export const sampleGraphData = {
  warehouses: [
    { id: "W1", location: "New York", capacity: 2 },
    { id: "W2", location: "Chicago", capacity: 3 },
    { id: "W3", location: "Dallas", capacity: 2 },
    { id: "W4", location: "Atlanta", capacity: 2 },
    { id: "W5", location: "Los Angeles", capacity: 2 }
  ],
  routes: [
    { id: "R1", source: "W1", destination: "W3", cost: 18.0, time: 6.0 },
    { id: "R2", source: "W1", destination: "W4", cost: 12.0, time: 5.0 },
    { id: "R3", source: "W2", destination: "W3", cost: 10.0, time: 4.0 },
    { id: "R4", source: "W2", destination: "W4", cost: 13.0, time: 4.0 },
    { id: "R5", source: "W2", destination: "W5", cost: 21.0, time: 7.0 },
    { id: "R6", source: "W3", destination: "W4", cost: 11.0, time: 3.0 },
    { id: "R7", source: "W3", destination: "W5", cost: 17.0, time: 6.0 },
    { id: "R8", source: "W4", destination: "W5", cost: 9.0, time: 3.0 },
    { id: "R9", source: "W5", destination: "W3", cost: 16.0, time: 5.0 },
    { id: "R10", source: "W4", destination: "W3", cost: 8.0, time: 3.0 }
  ],
  demand: [
    { region: "W3", required_units: 2 },
    { region: "W4", required_units: 1 },
    { region: "W5", required_units: 1 }
  ]
};
