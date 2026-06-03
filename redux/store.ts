import { configureStore } from "@reduxjs/toolkit";

import shapesReducer from "@/redux/slice/shapes";
import viewportReducer from "@/redux/slice/viewport";

export const makeStore = () =>
  configureStore({
    reducer: {
      shapes: shapesReducer,
      viewport: viewportReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];