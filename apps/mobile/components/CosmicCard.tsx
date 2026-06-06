import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface CosmicCardProps extends ViewProps {
  children: React.ReactNode;
  intensity?: number;
  hasGlow?: boolean;
}

export function CosmicCard({ children, intensity = 40, hasGlow = true, style, ...props }: CosmicCardProps) {
  return (
    <View 
      className="overflow-hidden rounded-[24px] border border-gold-500/20"
      style={[
        hasGlow && {
          shadowColor: '#C6A96B',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 5,
        },
        style
      ]}
      {...props}
    >
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* Subtle Gradient Overlay */}
      <LinearGradient
        colors={['rgba(10, 34, 64, 0.4)', 'rgba(2, 6, 23, 0.6)']}
        style={StyleSheet.absoluteFill}
      />
      
      <View className="p-5">
        {children}
      </View>
    </View>
  );
}
