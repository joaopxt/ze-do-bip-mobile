/**
 * Input Component - Migrado do MVP Lovable
 * Adaptado para React Native com StyleSheet
 */

import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, TextInput, TextStyle, View, ViewStyle } from 'react-native';
export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: 'default' | 'done' | 'go' | 'next' | 'search' | 'send';
  blurOnSubmit?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  multiline = false,
  numberOfLines = 1,
  style,
  containerStyle,
  onFocus,
  onBlur,
  autoFocus = false,
  onSubmitEditing,
  returnKeyType = 'default',
  blurOnSubmit = true,
  leftIcon,
  rightIcon,
}) => {
  return (
    <View style={[styles.container, containerStyle, !editable && styles.disabledContainer]}>
      {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline,
          !editable && styles.disabledInput,
          style,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        blurOnSubmit={blurOnSubmit}
      />
      {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  disabledContainer: {
    backgroundColor: Colors.gray[50],
    borderColor: Colors.gray[200],
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: Colors.text,
  },
  disabledInput: {
    color: Colors.textSecondary,
  },
  multiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  iconLeft: {
    paddingLeft: 12,
  },
  iconRight: {
    paddingRight: 12,
  },
}); 