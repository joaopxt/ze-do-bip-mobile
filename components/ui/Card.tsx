/**
 * Card Component - Migrado do MVP Lovable
 * Adaptado para React Native com StyleSheet
 */

import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export interface CardDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {children}
    </CardComponent>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => (
  <View style={[styles.header, style]}>
    {children}
  </View>
);

export const CardTitle: React.FC<CardTitleProps> = ({ children, style }) => (
  <Text style={[styles.title, style]}>
    {children}
  </Text>
);

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, style }) => (
  <Text style={[styles.description, style]}>
    {children}
  </Text>
);

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => (
  <View style={[styles.content, style]}>
    {children}
  </View>
);

export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => (
  <View style={[styles.footer, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    shadowColor: Colors.gray[900],
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, // Para Android
    marginBottom: 12,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 0,
  },
}); 