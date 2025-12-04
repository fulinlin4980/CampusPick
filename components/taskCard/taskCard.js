// components/taskCard/taskCard.js
const OrderStatus = {
    PENDING: 'PENDING', ACCEPTED: 'ACCEPTED', DELIVERED: 'DELIVERED', 
    COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED',
};

Component({
    properties: {
        task: {
            type: Object,
            value: {},
            observer: function(newVal) {
                if (newVal && newVal.id) {
                    this.updateComputedData(newVal);
                }
            }
        },
        currentUserId: String, // 从父组件接收
        isActionLoading: Boolean,
        requirePhoto: Boolean
    },

    data: {
        isMine: false, isMyTask: false, formattedTime: '', statusBadge: {}, 
        canSeePickupCode: false, taskTypeLabel: '' 
    },

    attached() {
        // 在组件加载时确保计算一次数据
        this.updateComputedData(this.data.task);
    },

    methods: {
        // ... (formatDate, getStatusBadge, getTaskTypeLabel 函数保持不变) ...

        updateComputedData(order) {
            // 使用 properties 传递的 currentUserId
            const currentUserId = this.data.currentUserId || wx.getStorageSync('userId'); 

            const isMine = order.creatorId === currentUserId;
            const isMyTask = order.runnerId === currentUserId; 
            
            // 调试日志：检查按钮条件是否满足
            console.log(`[Card Computed] Status: ${order.status}, isMine: ${isMine}, isMyTask: ${isMyTask}`);

            const canSeePickupCode = order.type === 'express' && isMyTask && 
                                     order.status === OrderStatus.ACCEPTED && order.pickupCode;
            
            // ... (其他计算属性) ...

            this.setData({
                isMine,
                isMyTask,
                // ... (其他计算属性) ...
            });
        },

        /**
         * 转发 Action 事件给父页面
         */
        handleAction(e) 
        {
            // 🚨 调试日志 A：检查按钮点击是否成功捕获
            console.log('[TaskCard LOG] A: 按钮点击已捕获，准备转发'); 
            
            const actionType = e.currentTarget.dataset.action;
            const taskId = this.data.task.id;
            
            // 🚨 核心：使用最稳定的 Kebab-Case 'order-action' 派发事件
            console.log(`[TaskCard LOG] 派发事件: order-action, 动作: ${actionType}`); 
            this.triggerEvent('order-action', { 
                action: actionType, 
                id: taskId,
                requirePhoto: this.data.requirePhoto
            });
            console.log('[TaskCard LOG] B: 事件 order-action 派发完成');
        }
    }
});