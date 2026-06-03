import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
  {
    category: 'การใช้งานเบื้องต้น',
    items: [
      {
        question: 'วิธีการตั้งดวงชะตาทำอย่างไร?',
        answer: 'คุณสามารถตั้งดวงได้ที่เมนู "ดวงชะตา" โดยกรอก วัน เดือน ปี และเวลาเกิด ระบบจะคำนวณผังดวง 7 ตัว 9 ฐานให้โดยอัตโนมัติ'
      },
      {
        question: 'ข้อมูลที่กรอกมีความปลอดภัยหรือไม่?',
        answer: 'ข้อมูลของคุณถูกเก็บรักษาเป็นความลับและมีการป้องกันการเข้าถึงจากบุคคลภายนอกอย่างเข้มงวด'
      }
    ]
  },
  {
    category: 'ฟีเจอร์ AI',
    items: [
      {
        question: 'รายงาน AI ทำงานอย่างไร?',
        answer: 'AI ของเราวิเคราะห์จากผังดวง 7 ตัว 9 ฐาน ผสมผสานกับคัมภีร์ดั้งเดิม เพื่อสรุปแนวโน้มและคำแนะนำที่แม่นยำ'
      },
      {
        question: 'จำนวนการใช้งาน AI มีจำกัดหรือไม่?',
        answer: 'ขึ้นอยู่กับแพ็กเกจที่คุณใช้งาน โดยคุณสามารถตรวจสอบโควต้าได้ที่หน้า "รายงาน AI"'
      }
    ]
  },
  {
    category: 'การวางแผนชีวิต',
    items: [
      {
        question: 'ปฏิทินวางแผนช่วยอะไรได้บ้าง?',
        answer: 'ช่วยให้คุณทราบวันมงคล วันที่ควรระวัง และช่วยในการนัดหมายหรือเริ่มต้นงานสำคัญให้ตรงกับฤกษ์ยามที่ดี'
      }
    ]
  }
];

export default function HowToUseScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#C9A96E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>วิธีการใช้งาน</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.introBox}>
          <Ionicons name="help-circle-outline" size={40} color="#C9A96E" />
          <Text style={styles.introTitle}>คลังความรู้ & วิธีการใช้งาน</Text>
          <Text style={styles.introText}>
            ยินดีต้อนรับสู่ศูนย์ช่วยเหลือของ Phopephum ที่นี่รวบรวมคำอธิบายฟังก์ชั่นและการตอบคำถามที่พบบ่อย
          </Text>
        </View>

        {FAQ_DATA.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionCategory}>{section.category}</Text>
            {section.items.map((item, itemIdx) => (
              <AccordionItem key={itemIdx} question={item.question} answer={item.answer} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function AccordionItem({ question, answer }: { question: string, answer: string }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity onPress={toggleExpand} style={styles.accordionHeader}>
        <Text style={styles.questionText}>{question}</Text>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#8A8070" 
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.accordionContent}>
          <Text style={styles.answerText}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0806',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2018',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#C9A96E',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  scrollContent: {
    padding: 20,
  },
  introBox: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#15120F',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2018',
  },
  introTitle: {
    color: '#F8F6F1',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  introText: {
    color: '#8A8070',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionCategory: {
    color: '#C9A96E',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  accordionContainer: {
    backgroundColor: '#15120F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2018',
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  questionText: {
    color: '#F8F6F1',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  accordionContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 32, 24, 0.5)',
  },
  answerText: {
    color: '#8A8070',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
});
