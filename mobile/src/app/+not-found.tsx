import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/controls';
import { Message } from '@/components/states';
import { useColors } from '@/lib/appearance';

export default function NotFound() {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
      <Message
        icon="flag"
        title="Wrong turn"
        body="That screen doesn't exist."
        action={<Button label="Go home" onPress={() => router.replace('/')} />}
      />
    </View>
  );
}
