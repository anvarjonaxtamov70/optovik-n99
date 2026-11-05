import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows } from "../store/theme";
const CATS = [
  { id: "aksessuarlar", label: "Aksessuarlar", icon: "car-sport-outline" },
  { id: "dvigatel", label: "Dvigatel", icon: "hardware-chip-outline" },
  { id: "tormoz", label: "Tormoz", icon: "disc-outline" },
  { id: "elektrika", label: "Elektrika", icon: "battery-charging-outline" },
  { id: "all", label: "Barchasi", icon: "grid-outline" }
];
export const CategoryBar = ({ selectedCategory, onSelectCategory }) => (
  <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.background }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {CATS.map(c => {
        const sel = selectedCategory === c.id;
        return (
          <TouchableOpacity key={c.id} style={{ alignItems: "center", width: "18%" }} onPress={() => onSelectCategory(c.id)}>
            <View style={[{ width: 52, height: 52, borderRadius: radii.lg, backgroundColor: sel ? colors.primaryDark : colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 6 }, shadows.card]}>
              <Ionicons name={c.icon} size={23} color={sel ? "#FFF" : colors.text} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: sel ? "800" : "600", color: colors.text }}>{c.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);