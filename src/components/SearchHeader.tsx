import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows } from "../store/theme";
export const SearchHeader = ({ searchQuery, onSearchChange, onOpenFilter, activeFilterCount = 0 }) => (
  <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, backgroundColor: colors.background }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <View>
        <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>OPTOVIK N99</Text>
        <View style={{ width: 68, height: 3, backgroundColor: colors.primary, borderRadius: 2 }} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceMuted, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill }}>
        <Ionicons name="location-sharp" size={15} color={colors.primaryDark} />
        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>Samarqand</Text>
      </View>
    </View>
    <View style={{ flexDirection: "row", gap: 10 }}>
      <View style={[{ flex: 1, height: 48, backgroundColor: "#FFF", borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8 }, shadows.card]}>
        <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
        <TextInput value={searchQuery} onChangeText={onSearchChange} placeholder="Detal yoki aksessuar qidiring" placeholderTextColor={colors.textMuted} style={{ flex: 1, fontSize: 14, color: colors.text }} />
      </View>
      <TouchableOpacity style={[{ width: 48, height: 48, borderRadius: radii.lg, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }, shadows.card]} onPress={onOpenFilter}>
        <Ionicons name="options-outline" size={21} color={colors.text} />
      </TouchableOpacity>
    </View>
  </View>
);