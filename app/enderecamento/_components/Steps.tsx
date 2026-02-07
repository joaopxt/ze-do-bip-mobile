import { Colors } from "@/constants/Colors";
import { StyleSheet, Text, View } from "react-native";

interface StepsProps {
  step: 1 | 2;
}

export default function Steps({ step }: StepsProps) {
  return (
    <View style={styles.stepsContainer}>
      <View style={[styles.stepIndicator, step >= 1 && styles.stepActive]}>
        <Text style={[styles.stepText, step >= 1 && styles.stepTextActive]}>
          1. Produto
        </Text>
      </View>
      <View style={styles.stepLine} />
      <View style={[styles.stepIndicator, step >= 2 && styles.stepActive]}>
        <Text style={[styles.stepText, step >= 2 && styles.stepTextActive]}>
          2. Endereço
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  stepIndicator: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  stepActive: {
    backgroundColor: Colors.primary,
  },
  stepText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  stepTextActive: {
    color: "#fff",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 8,
  },
});
