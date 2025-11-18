import "./globals.css";
import type { Metadata } from "next";


export const metadata: Metadata = {
title: "Espaço de Recordações",
description: "Upload e visualização de memórias em imagens.",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="pt-BR">
<body>{children}</body>
</html>
);
}