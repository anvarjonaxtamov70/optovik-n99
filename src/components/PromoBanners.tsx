import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows } from "../store/theme";
export const PromoBanners = ({ onSelectGM, onSelectAccessories }) => (
  <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, gap: 12 }}>
    <TouchableOpacity style={[{ height: 144, borderRadius: radii.banner, backgroundColor: "#E0F2FE", flexDirection: "row", padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#BAE6FD" }, shadows.card]} onPress={onSelectGM}>
      <View style={{ flex: 1.2 }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>GM uchun\nehtiyot qismlar</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginVertical: 6 }}>Cobalt · Gentra · Nexia</Text>
        <View style={[{ alignSelf: "flex-start", backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, flexDirection: "row", alignItems: "center", gap: 5 }, shadows.buttonGlow]}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>Qismlarni ko‘rish</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.text} />
        </View>
      </View>
      <Image source={{ uri: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80" }} style={{ flex: 0.9, height: "100%" }} resizeMode="contain" />
    </TouchableOpacity>
  </View>
);