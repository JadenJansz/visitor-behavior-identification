import "./App.css";
import WebSocketComponent from "./WebSocket";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>ESP32 WebSocket Audio Trigger</h1>
        <WebSocketComponent />
      </header>
    </div>
  );
}

export default App;
