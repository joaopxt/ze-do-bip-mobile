/**
 * Button Component - Migrado do MVP Lovable
 * Adaptado para React Native com StyleSheet
 */

import { Colors } from '@/constants/Colors';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const buttonStyle = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const textStyleCombined = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? Colors.primary : Colors.textInverse} 
          size="small" 
        />
      ) : (
        <Text style={textStyleCombined}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Base styles
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
  },

  // Variant styles
  variant_default: {
    backgroundColor: Colors.primary,
  },
  variant_destructive: {
    backgroundColor: Colors.danger,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  variant_secondary: {
    backgroundColor: Colors.gray[100],
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },

  // Size styles
  size_default: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  size_sm: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  size_lg: {
    minHeight: 44,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },

  // Text styles
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  text_default: {
    color: Colors.textInverse,
  },
  text_destructive: {
    color: Colors.textInverse,
  },
  text_outline: {
    color: Colors.text,
  },
  text_secondary: {
    color: Colors.text,
  },
  text_ghost: {
    color: Colors.primary,
  },

  // Text size styles
  textSize_default: {
    fontSize: 14,
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_lg: {
    fontSize: 16,
  },

  // Disabled styles
  disabled: {
    opacity: 0.5,
  },
  textDisabled: {
    opacity: 0.5,
  },
}); 