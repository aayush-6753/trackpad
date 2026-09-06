import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { NavigationBar } from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  useKeepAwake();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar hidden />
      <NavigationBar hidden />

      <Stack
        screenOptions={{
          headerShown: false,
          orientation: "landscape",
        }}
      />
    </GestureHandlerRootView>
  );
}