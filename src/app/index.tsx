import { useCallback, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
  const lastX = useRef(0);
  const lastY = useRef(0);
  const gestureStartedAt = useRef(0);

  const sendMessage = useCallback((message: object) => {
    const socket = socketRef.current;

    if (socket?.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
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

    const socketUrl =
      `ws://${cleanIp}:8080?pin=${encodeURIComponent(cleanPin)}`;

    const socket = new WebSocket(socketUrl);
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        lastX.current = 0;
        lastY.current = 0;
        gestureStartedAt.current = Date.now();
      },

      onPanResponderMove: (_, gesture) => {
        const deltaX = gesture.dx - lastX.current;
        const deltaY = gesture.dy - lastY.current;

        lastX.current = gesture.dx;
        lastY.current = gesture.dy;

        sendMessage({
          type: "move",
          dx: Math.round(deltaX * 1.4),
          dy: Math.round(deltaY * 1.4),
        });
      },

      onPanResponderRelease: (_, gesture) => {
        const duration = Date.now() - gestureStartedAt.current;
        const distance = Math.hypot(gesture.dx, gesture.dy);

        if (duration < 300 && distance < 8) {
          sendMessage({ type: "leftClick" });
        }
      },

      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const connected = status === "Connected";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Wireless Trackpad</Text>
          <Text style={styles.subtitle}>
            Control your Ubuntu laptop over Wi-Fi
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              connected
                ? styles.statusConnected
                : styles.statusDisconnected,
            ]}
          />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      {!connected && (
        <View style={styles.connectionPanel}>
          <TextInput
            style={styles.input}
            value={ipAddress}
            onChangeText={setIpAddress}
            placeholder="Laptop IP address"
            placeholderTextColor="#777"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            placeholder="Server PIN"
            placeholderTextColor="#777"
            keyboardType="number-pad"
            maxLength={6}
          />

          <Pressable
            style={({ pressed }) => [
              styles.connectButton,
              pressed && styles.pressed,
            ]}
            onPress={connectToLaptop}
          >
            <Text style={styles.connectButtonText}>
              Connect to laptop
            </Text>
          </Pressable>
        </View>
      )}

      <View
        style={[
          styles.trackpad,
          !connected && styles.trackpadDisabled,
        ]}
        pointerEvents={connected ? "auto" : "none"}
        {...panResponder.panHandlers}
      >
        <Text style={styles.trackpadText}>
          {connected
            ? "Move your finger here"
            : "Connect to enable trackpad"}
        </Text>

        {connected && (
          <Text style={styles.trackpadHint}>
            Tap once to left-click
          </Text>
        )}
      </View>

      <View style={styles.mouseButtons}>
        <Pressable
          disabled={!connected}
          style={({ pressed }) => [
            styles.mouseButton,
            !connected && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={() => sendMessage({ type: "leftClick" })}
        >
          <Text style={styles.mouseButtonText}>Left click</Text>
        </Pressable>

        <Pressable
          disabled={!connected}
          style={({ pressed }) => [
            styles.mouseButton,
            !connected && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={() => sendMessage({ type: "rightClick" })}
        >
          <Text style={styles.mouseButtonText}>Right click</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#101114",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#969ba6",
    fontSize: 13,
    marginTop: 3,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 7,
  },
  statusConnected: {
    backgroundColor: "#4ade80",
  },
  statusDisconnected: {
    backgroundColor: "#f87171",
  },
  statusText: {
    color: "#d5d7dc",
    fontSize: 13,
  },
  connectionPanel: {
    backgroundColor: "#191b20",
    borderColor: "#292c33",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  input: {
    height: 48,
    backgroundColor: "#101114",
    borderColor: "#32353d",
    borderWidth: 1,
    borderRadius: 11,
    color: "#ffffff",
    paddingHorizontal: 14,
    fontSize: 16,
  },
  connectButton: {
    height: 48,
    backgroundColor: "#5b7cfa",
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  connectButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  trackpad: {
    flex: 1,
    backgroundColor: "#1a1c21",
    borderColor: "#383c45",
    borderWidth: 1,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  trackpadDisabled: {
    opacity: 0.45,
  },
  trackpadText: {
    color: "#e5e7eb",
    fontSize: 18,
    fontWeight: "600",
  },
  trackpadHint: {
    color: "#858b96",
    fontSize: 13,
    marginTop: 8,
  },
  mouseButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  mouseButton: {
    flex: 1,
    height: 52,
    backgroundColor: "#24272e",
    borderColor: "#393d47",
    borderWidth: 1,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  mouseButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});