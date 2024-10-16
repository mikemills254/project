import React from 'react';
import { ActivityIndicator, Modal, View } from 'react-native';

const Loader = ({ visible }) => {
  return (
    <Modal visible={visible} transparent>
      <View className="flex-1 bg-black/50 justify-center items-center">
        <View className="px-5 py-2.5 bg-white flex-row items-center justify-center rounded-md">
          <ActivityIndicator size={'large'} color={'#00e5e5'} />
        </View>
      </View>
    </Modal>
  );
};

export default Loader;