"use client";
import {createContext} from "react";
export const EmbeddedAdminContext=createContext(false);
export const NativeActionsContext=createContext<{siteUrl:string;share:(url:string)=>Promise<void>}|null>(null);
