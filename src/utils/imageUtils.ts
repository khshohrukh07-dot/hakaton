export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 900,
  quality = 0.72,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выберите файл изображения (JPG, PNG, WebP).');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Размер файла превышает 15 МБ.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Файл повреждён или не является изображением.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / Math.max(1, img.width));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Ошибка обработки изображения в браузере.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const BUILTIN_DEMO_PHOTOS = [
  {
    label: 'Подъём воды у моста',
    url: '/src/assets/images/event_river_bridge_1795418195316.jpg',
  },
  {
    label: 'Укрепление дамбы мешками',
    url: '/src/assets/images/event_levee_sandbags_1795418194151.jpg',
  },
  {
    label: 'Насосная станция и водомер',
    url: '/src/assets/images/event_pump_station_1795418193866.jpg',
  },
];
