// components/button/button.js
Component({
    properties: {
      variant: { type: String, value: 'primary' },
      size: { type: String, value: 'md' },
      className: { type: String, value: '' },
      disabled: { type: Boolean, value: false }
    },
  
    methods: {
      // 转发点击事件，使用标准的 'tap' 事件名
      handleTap(e) {
        if (!this.data.disabled) {
          // 🚨 核心：派发 'tap' 事件
          this.triggerEvent('tap', e.detail); 
        }
      }
    }
  });