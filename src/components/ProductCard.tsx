import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows } from "../store/theme";
export const ProductCard = ({ product, quantityInCart = 0, isSaved = false, onAddToCart, onIncrement, onDecrement, onToggleSave, onPress }) => {
  const hasDiscount = Boolean(product.eskiNarx && product.eskiNarx > product.narx);
  return (
    <TouchableOpacity style={[{ flex: 1, backgroundColor: "#FFF", borderRadius: radii.card, borderWidth: 1, borderColor: colors.borderLight, overflow: "hidden", marginBottom: 12 }, shadows.card]} activeOpacity={0.9} onPress={onPress}>
      <View style={{ width: "100%", height: 146, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" }}>
        <Image source={{ uri: product.rasm || "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80" }} style={{ width: "90%", height: "90%" }} resizeMode="contain" />
        <View style={{ position: "absolute", top: 8, left: 8, gap: 6 }}>
          <View style={[{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" }, shadows.badge]}>
            <Ionicons name="scale-outline" size={15} color={colors.textSecondary} />
          </View>
          {hasDiscount && (
            <View style={{ backgroundColor: colors.badgeDiscount, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "800" }}>-15%</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={[{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" }, shadows.badge]} onPress={onToggleSave}>
          <Ionicons name={isSaved ? "heart" : "heart-outline"} size={16} color={isSaved ? colors.badgeDiscount : colors.text} />
        </TouchableOpacity>
      </View>
      <View style={{ padding: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, minHeight: 38 }} numberOfLines={2}>{product.nomi}</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{product.model || "Universal"}</Text>
        <Text style={{ fontSize: 11, fontWeight: "600", color: colors.success, marginTop: 4 }}>Mavjud</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginVertical: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>{product.narx?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so‘m</Text>
        </View>
        {quantityInCart > 0 ? (
          <View style={[{ height: 42, backgroundColor: colors.primary, borderRadius: radii.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10 }, shadows.buttonGlow]}>
            <TouchableOpacity onPress={onDecrement} style={{ padding: 6 }}><Ionicons name="remove" size={18} color={colors.text} /></TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>{quantityInCart}</Text>
            <TouchableOpacity onPress={onIncrement} style={{ padding: 6 }}><Ionicons name="add" size={18} color={colors.text} /></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[{ height: 42, backgroundColor: colors.primary, borderRadius: radii.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, shadows.buttonGlow]} onPress={onAddToCart}>
            <Ionicons name="bag-handle-outline" size={17} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>Savatga</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};