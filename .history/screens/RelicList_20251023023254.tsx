import React from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from "react-native";
import Button from "../components/Button";
export default function RelicList({ route, navigation }) {
    const { relics, title } = route.params;

    const handleSelectRelic = (relic) => {
        navigation.navigate("View3D", {
            modelUrl: relic.modelUrl,
            title: relic.name,
        });

    };

    return (
        <View style={styles.container}>
            <Button />
            <Text style={styles.header}>{title} - Relics & Artifacts</Text>

            {relics.length === 0 ? (
                <Text style={styles.empty}>No relics found for this landmark.</Text>
            ) : (
                <FlatList
                    data={relics}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.item} onPress={() => handleSelectRelic(item)}>
                            {item.imageUrl && (
                                <Image source={{ uri: item.imageUrl }} style={styles.image} />
                            )}
                            <Text style={styles.itemText}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", padding: 16 },
    header: { marginTop: 5, marginLeft: 40, fontSize: 20, fontWeight: "bold", marginBottom: 10 },
    item: {
        padding: 10,
        marginBottom: 10,
        backgroundColor: "#f3f3f3",
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",

    },
    itemText: { fontSize: 16, marginLeft: 10 },
    image: { width: 60, height: 60, borderRadius: 8 },
    empty: { textAlign: "center", marginTop: 40, color: "#999" },
});
