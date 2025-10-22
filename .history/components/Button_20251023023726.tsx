import { View, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import AntDesign from '@expo/vector-icons/AntDesign'
import { useNavigation } from '@react-navigation/native'
const Button = () => {
    const navigation = useNavigation();
    return (
        <TouchableOpacity style={styles.container} onPress={() => navigation.goBack()}>
            <AntDesign name="arrowleft" size={24} color="black" />
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 10,
        left: 20,

        padding: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center'
    }
})

export default Button;