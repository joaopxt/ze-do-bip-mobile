/**
 * Badge Component - Migrado do MVP Lovable
 * Adaptado para React Native com StyleSheet
 */

import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  style,
  textStyle,
}) => {
  const badgeStyle = [
    styles.base,
    styles[`variant_${variant}`],
    style,
  ];

  const textStyleCombined = [
    styles.text,
    styles[`text_${variant}`],
    textStyle,
  ];

  return (
    <View style={badgeStyle}>
      <Text style={textStyleCombined}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },

  // Variant styles
  variant_default: {
    backgroundColor: Colors.primary,
    borderColor: 'transparent',
  },
  variant_secondary: {
    backgroundColor: Colors.gray[100],
    borderColor: 'transparent',
  },
  variant_destructive: {
    backgroundColor: Colors.danger,
    borderColor: 'transparent',
  },
  variant_success: {
    backgroundColor: Colors.success,
    borderColor: 'transparent',
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderColor: Colors.gray[300],
  },

  // Text styles
  text: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  text_default: {
    color: Colors.textInverse,
  },
  text_secondary: {
    color: Colors.text,
  },
  text_destructive: {
    color: Colors.textInverse,
  },
  text_success: {
    color: Colors.textInverse,
  },
  text_outline: {
    color: Colors.text,
  },
}); 