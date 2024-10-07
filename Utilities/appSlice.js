import { createSlice } from "@reduxjs/toolkit";

const InitialState = {
    isAuthenticated: false,
    user: null,
};

const userSlice = createSlice({
    name: "auth",
    initialState: InitialState,
    reducers: {
        loginSuccess(state, action) {
            state.isAuthenticated = true;
            state.user = action.payload;
        },
        authFailed(state) {
            state.isAuthenticated = false;
            state.user = null;
        },
        registerSuccess(state, action) {
            state.isAuthenticated = true;
            state.user = action.payload;
        },
        logOut: (state) => {
            state.isAuthenticated = false,
            state.user = null
        },
        updateUser: (state, action) => {
            if(state.user){
                state.user.profileImage = action.payload
            }
        }
    },
});

export const { loginSuccess, registerSuccess, authFailed, logOut, updateUser } = userSlice.actions;
export default userSlice.reducer;
