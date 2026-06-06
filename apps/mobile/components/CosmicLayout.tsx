import React from 'react';
import { View, SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

interface CosmicLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

export function CosmicLayout({ children, scrollable = true }: CosmicLayoutProps) {
  const Content = scrollable ? ScrollView : View;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#020617', '#071427', '#0A2240']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <Content 
          style={{ flex: 1 }}
          contentContainerStyle={scrollable ? { paddingBottom: 100 } : undefined}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </Content>
      </SafeAreaView>
    </View>
  );
}
