import React from 'react'
import { TouchableOpacity, View, Image, Text } from 'react-native';
import SignupScreen from "../Screens/SignUpScreen";
import LoginScreen from "../Screens/LoginScreen";
import ForgetPasswordScreen from "../Screens/ForgetPasswordScreen";
import MainScreen from "../Screens/MainScreen";
import ChatScreen from "../Screens/ChatScreen";
import ProfileScreen from "../Screens/ProfileScreen";
import GroupsScreen from "../Screens/GroupScreen";
import GroupScreen from "../Screens/GroupsScreen"
import AntDesign from 'react-native-vector-icons/AntDesign'
import Icon from "react-native-vector-icons/Ionicons"
import profile from "../assets/blank-profile-picture-973460_1280.png"
import CreateGroup from "../Screens/CreateGroup"


import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';


const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

const AuthScreens = () => {
    return (
        <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
                headerShown: false
            }}
        >
            <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Signup"
                component={SignupScreen}
            />
            <Stack.Screen
                name="Forgot"
                component={ForgetPasswordScreen}
                options={{
                    headerTitle: "Forgot your password?",
                    headerTitleStyle: {
                        color: "#00e5e5",
                        fontSize: 20,
                    },
                    headerTintColor: "#00e5e5",
                }}
            />
        </Stack.Navigator>
    )
}

const MainScreens = ({navigation}) => (
    <Tab.Navigator
        initialRouteName="Chat"
        screenOptions={({ route, focused }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === 'Chat') {
                    iconName = focused ? 'wechat' : 'wechat';
                    color = focused ? '#00e5e5' : 'black';
                    size = focused ? 25 : 20;
                } else if (route.name === 'Groups') {
                    iconName = focused ? 'calendar' : 'calendar';
                    color = focused ? '#00e5e5' : 'black';
                    size = focused ? 25 : 20
                }

                return <AntDesign name={iconName} color={color} size={size} />;
            },
            tabBarStyle: {
                height: 60,
                alignItems: "center"
            },
            tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: focused ? 'bold' : 'normal',
            },
            tabBarItemStyle: {
                marginVertical: 5,
            },
            tabBarActiveTintColor: '#00e5e5',
            tabBarInactiveTintColor: '#8e8e93',
            tabBarHideOnKeyboard: true,
        })}
    >
        <Tab.Screen
            name="Chat"
            component={MainScreen}
            options={{
                headerShown: true,
                headerTitle: "Whatsapp.X.no",
                headerTintColor: "#00e5e5",
                headerRight: () => {
                    return (
                        <TouchableOpacity onPress={() => navigation.navigate("OtherScreens", {screen: "Profile"})} className="mr-4">
                            <Icon name='menu-outline' size={32}/>
                        </TouchableOpacity>
                    )
                }
            }}
        />
        
        <Tab.Screen
            name="Groups"
            component={GroupsScreen}
            options={{
                title: "Groups",
                headerTitle: "Your Groups",
                headerShown: true,
                headerLeft: () => {
                    return (
                        <TouchableOpacity className="ml-5">
                            <Icon name="chevron-back-outline" size={24}/>
                        </TouchableOpacity>
                    )
                },
                headerRight: () => {
                    return (
                        <TouchableOpacity onPress={() => navigation.navigate("OtherScreens", {screen: "CreateGroup"})} className="mr-5">
                            <Text>Create</Text>
                        </TouchableOpacity>
                    )
                }
            }}
        />
        
    </Tab.Navigator>
);

const OtherScreens = ({ navigation }) => {
    return (
        <Stack.Navigator
            initialRouteName='Profile'
        >
            <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={({ navigation }) => ({
                    headerTitle: "Profile",
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate("Login");
                            }}
                        >
                            <Icon
                                name="log-out"
                                size={24}
                                color="white"
                                style={{ marginRight: 10 }}
                            />
                        </TouchableOpacity>
                    ),
                })}
            />

        <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({
                title: route.params?.name || route.params?.mail,
                headerLeft: () => {
                    return (
                        <View className="flex flex-row items-center gap-3 mr-3">
                            <Icon name="chevron-back-outline" size={22} className="mr-5" onPress={() => navigation.goBack()}/>
                            <Image source={route.params.profile ? {uri: route.params.profile}: profile} className="w-12 h-12 rounded-full"/>
                        </View>
                    )
                }
            })}
        />
        <Stack.Screen
            name="CreateGroup"
            component={CreateGroup}
            options={{ headerShown: true }}
        />
        <Stack.Screen
            name="GroupChat"
            component={GroupScreen}
            options={({ route }) => ({
                title: route.params.name,
                headerLeft: () => {
                    return (
                        <View className="flex flex-row items-center gap-3 mr-3">
                            <Icon name="chevron-back-outline" size={22} className="mr-5" onPress={() => navigation.goBack()}/>
                            <Image source={route.params.profile ? {uri: route.params.profile} : profile} className="w-12 h-12 rounded-full"/>
                        </View>
                    )
                }
            })}
        />
        </Stack.Navigator>
    )
}

export default function Navigation() {
    const isAuthenticated = useSelector(state => state.auth.isAuthenticated)
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={isAuthenticated ? "MainScreens" : "AuthScreen" }
                screenOptions={{ headerShown: false }}
            >
                {
                    isAuthenticated ? (
                        <>
                            <Stack.Screen name="MainScreens" component={MainScreens}/>
                            <Stack.Screen name="OtherScreens" component={OtherScreens}/>
                        </>
                    ) : (
                        <>
                            <Stack.Screen name="AuthScreens" component={AuthScreens}/>
                        </>
                    )
                }
            </Stack.Navigator>
        </NavigationContainer>
    )
}