import { View, Text, SafeAreaView } from 'react-native'
import React from 'react'
import Navigation from './components/Navigation'
import { StatusBar } from 'expo-status-bar'
import {Provider} from "react-redux"
import { store, persistor } from "./Utilities/appStore"
import { PersistGate } from 'redux-persist/integration/react'

export default function App() {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <Provider store={store}>
                <PersistGate loading={null} persistor={persistor}>
                    <Navigation />
                </PersistGate>
            </Provider>
        </SafeAreaView>
    )
}