import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

type ConnectionStatus =
  | "Disconnected"
  | "Connecting"
  | "Connected"
  | "Connection failed";

export default function TrackpadScreen() {
  const [ipAddress, setIpAddress] = useState("192.168.29.186");
  const [pin, setPin] = useState("");
  const [status, setStatus] =
    useState<ConnectionStatus>("Disconnected");

  const socketRef = useRef<WebSocket | null>(null);
  const previousX = useRef(0);
  const previousY = useRef(0);

  const sendMessage = useCallback((message: object) => {
    const socket = socketRef.current;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setStatus("Disconnected");
  }, []);

  const connectToLaptop = () => {
    const cleanIp = ipAddress.trim();
    const cleanPin = pin.trim();

    if (!cleanIp || !cleanPin) {
      setStatus("Connection failed");
      return;
    }

    socketRef.current?.close();
    setStatus("Connecting");

    const socket = new WebSocket(
      `ws://${cleanIp}:8080?pin=${encodeURIComponent(cleanPin)}`
    );

    socketRef.current = socket;

    socket.onopen = () => {
      setStatus("Connected");
    };

    socket.onerror = () => {
      setStatus("Connection failed");
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
        setStatus("Disconnected");
      }
    };
  };

  const gestures = useMemo(() => {
    const pointerMovement = Gesture.Pan()
      .maxPointers(1)
      .minDistance(1)
      .runOnJS(true)
      .onBegin(() => {
        previousX.current = 0;
        previousY.current = 0;
      })
      .onUpdate((event) => {
        const deltaX =
          event.translationX - previousX.current;
        const deltaY =
          event.translationY - previousY.current;

        previousX.current = event.translationX;
        previousY.current = event.translationY;

        const dx = Math.round(deltaX * 1.5);
        const dy = Math.round(deltaY * 1.5);

        if (dx === 0 && dy === 0) {
          return;
        }

        sendMessage({
          type: "move",
          dx,
          dy,
        });
      });

    const leftClick = Gesture.Tap()
      .minPointers(1)
      .maxDuration(350)
      .maxDistance(12)
      .runOnJS(true)
      .onEnd((_, successful) => {
        if (successful) {
          sendMessage({ type: "leftClick" });
        }
      });

    const rightClick = Gesture.Tap()
      .minPointers(2)
      .maxDuration(450)
      .maxDistance(20)
      .runOnJS(true)
      .onEnd((_, successful) => {
        if (successful) {
          sendMessage({ type: "rightClick" });
        }
      });

    const disconnectGesture = Gesture.Tap()
      .minPointers(3)
      .maxDuration(500)
      .maxDistance(24)
      .runOnJS(true)
      .onEnd((_, successful) => {
        if (successful) {
          disconnect();
        }
      });

    const clickGestures = Gesture.Exclusive(
  disconnectGesture,
  rightClick,
  leftClick
);

return Gesture.Simultaneous(
  pointerMovement,
  clickGestures
);
  }, [disconnect, sendMessage]);

  const connected = status === "Connected";

  if (connected) {
    return (
      <GestureDetector gesture={gestures}>
        <View style={styles.trackpad}>
          <View style={styles.connectionIndicator} />

          <Text style={styles.gestureHint}>
            
          </Text>
        </View>
      </GestureDetector>
    );
  }

  return (
    <View style={styles.connectionScreen}>
      <View style={styles.connectionCard}>
        <Text style={styles.title}>Wireless Trackpad</Text>

        <Text style={styles.subtitle}>
          Enter the address shown by the laptop server
        </Text>

        <TextInput
          style={styles.input}
          value={ipAddress}
          onChangeText={setIpAddress}
          placeholder="Laptop IP address"
          placeholderTextColor="#777b84"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="Six-digit PIN"
          placeholderTextColor="#777b84"
          keyboardType="number-pad"
          maxLength={6}
        />

        <Pressable
          style={({ pressed }) => [
            styles.connectButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={connectToLaptop}
        >
          <Text style={styles.connectButtonText}>
            {status === "Connecting"
              ? "Connecting..."
              : "Connect"}
          </Text>
        </Pressable>

        {status === "Connection failed" && (
          <Text style={styles.errorText}>
            Connection failed. Check the IP, PIN and server.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trackpad: {
    flex: 1,
    backgroundColor: "#15171b",
    justifyContent: "center",
    alignItems: "center",
  },
  connectionIndicator: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#4ade80",
  },
  gestureHint: {
    color: "#6f747d",
    fontSize: 14,
    lineHeight: 23,
    textAlign: "center",
  },
  connectionScreen: {
    flex: 1,
    backgroundColor: "#101114",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  connectionCard: {
    width: "100%",
    maxWidth: 430,
    padding: 22,
    borderRadius: 18,
    backgroundColor: "#191b20",
    borderWidth: 1,
    borderColor: "#30333b",
    gap: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9297a1",
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    height: 48,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#363a43",
    backgroundColor: "#101114",
    color: "#ffffff",
    paddingHorizontal: 14,
    fontSize: 16,
  },
  connectButton: {
    height: 48,
    borderRadius: 11,
    backgroundColor: "#5b7cfa",
    justifyContent: "center",
    alignItems: "center",
  },
  connectButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.75,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    textAlign: "center",
  },
});