// pages/orderDetail/orderDetail.js

// 🚨 核心：请将 'http://localhost:8080' 替换为您可访问的服务器实际 IP 地址，否则手机端或模拟器无法访问。
const BASE_URL = 'http://localhost:8080/v1'; 
const DETAIL_URL = `${BASE_URL}/orders/detail`; 
const ACTION_URL = `${BASE_URL}/orders/action`;

Page({
    data: {
        task: null,         // 订单详情数据
        taskId: null,
        currentUserId: null,
        isActionLoading: false, // 按钮加载状态
        requirePhoto: false,    
        taskStatus: 'LOADING' 
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        const taskId = options.id;
        // 注意：这里确保获取到当前用户ID，用于权限判断
        const currentUserId = wx.getStorageSync('userId'); 
        
        this.setData({ 
            taskId: taskId,
            currentUserId: currentUserId
        });
        
        if (taskId) {
            this.loadTaskDetail(taskId);
        }
    },
    
    /**
     * 监听页面显示，用于从接单确认页返回后刷新状态
     */
    onShow() {
        if (this.data.taskId && this.data.taskStatus !== 'LOADING') {
            // 页面返回时刷新数据，以确保状态是最新的
            this.loadTaskDetail(this.data.taskId);
        }
    },

    // --- 【确认接单逻辑 (直接在当前页完成)】---

    /**
     * 对应 WXML 按钮的 bindtap 事件
     */
    handleAcceptOrder: function() {
        // 1. 防重复点击检查
        if (this.data.isActionLoading) return;
        
        const taskId = this.data.taskId;
        const currentUserId = this.data.currentUserId;
        
        if (!taskId || !currentUserId) {
            wx.showToast({ title: '数据缺失，请检查', icon: 'none' });
            return;
        }

        // 2. 弹出二次确认框
        wx.showModal({
            title: '确认接单',
            content: '确定要接下这个订单吗？',
            confirmText: '确认接单',
            confirmColor: '#3370ff',
            success: (res) => {
                if (res.confirm) {
                    this.executeAction('accept', taskId, currentUserId);
                }
            }
        });
    },
    
    /**
     * 【通用动作执行函数】取代了 executeAcceptOrder
     * @param {string} actionType - 'accept', 'delivered', 'complete', 'cancel'
     */
    executeAction: function(actionType, taskId, userId) {
        this.setData({ isActionLoading: true });
        wx.showLoading({ title: '处理中...' });
        
        // 核心调用 sendActionRequest
        this.sendActionRequest(taskId, actionType, userId) 
            .then(() => {
                wx.hideLoading();
                wx.showToast({ title: `${actionType}成功`, icon: 'success' });
                
                // ===============================================
                // 【核心修改点：设置任务大厅刷新标记】
                // 仅在执行 'accept' 动作成功后，设置一个本地存储标志
                if (actionType === 'accept') {
                    // 设置一个缓存键，用于通知任务列表页需要刷新
                    wx.setStorageSync('shouldRefreshTaskList', true); 
                }
                // ===============================================
                
                // 成功后手动更新状态，并刷新详情
                this.setData({
                    // 仅供快速 UI 反馈，最终以 loadTaskDetail 刷新为准
                    'task.status': actionType.toUpperCase(),
                });
                this.loadTaskDetail(taskId); // 成功后刷新详情
            })
            .catch((error) => {
                wx.hideLoading();
                console.error(`[OrderDetail] 动作失败: ${actionType}`, error);
                wx.showToast({ 
                    title: error.message || `${actionType}失败`, 
                    icon: 'none' 
                });
            })
            .finally(() => {
                this.setData({ isActionLoading: false });
            });
    },

    // --- 【原始函数保留 (部分逻辑修改)】---

    /**
     * 加载任务详情数据 (使用 POST 方式)
     */
    loadTaskDetail(taskId) 
    {
        wx.showLoading({ title: '加载中' });
        // ... (loadTaskDetail 逻辑保持不变) ...
        wx.request({
            url: DETAIL_URL, 
            method: 'POST',
            data: {
                orderId: taskId 
            },
            header: {
                'Content-Type': 'application/json',
                'Authorization': wx.getStorageSync('token') ? `Bearer ${wx.getStorageSync('token')}` : ''
            },
            success: (res) => {
                wx.hideLoading();
                if (res.data.code === 0 && res.data.data) {
                    this.setData({
                        task: res.data.data,
                        taskStatus: res.data.data.status
                    });
                } else {
                    console.error("[OrderDetail] API返回错误:", res.data.message);
                    wx.showToast({ title: res.data.message || '任务信息加载失败', icon: 'none' });
                }
            },
            fail: (err) => {
                wx.hideLoading();
                console.error("[OrderDetail] 网络请求失败:", err);
                wx.showToast({ title: '网络请求失败，请检查网络和服务器IP', icon: 'error' });
            }
        });
    },

    /**
     * 【核心】接收来自 taskCard 组件转发的动作事件
     * 修正：将 'accept' 逻辑改为调用 API，而不是跳转页面
     */
    handleAction(e) {
        console.log(`[OrderDetail LOG] 收到组件动作!`, e); 
        
        if (this.data.isActionLoading) return;
        
        const detail = e.detail;
        const actionType = detail.action; 
        const taskId = detail.id; 
        const userId = this.data.currentUserId;
        
        console.log(`orderDetail.js 收到动作: ${actionType}, 任务ID: ${taskId}`);

        // 1. 【确认接单逻辑】 => 直接调用 handleAcceptOrder 进行二次确认和 API 调用
        if (actionType === 'accept') {
            this.handleAcceptOrder(); // 调用上面新增的函数处理接单逻辑
            return;
        }

        // 2. 【跳转到处理页逻辑】 (确认送达)
        if (actionType === 'delivery') {
            const photoRequired = this.data.task.type === 'food' || this.data.task.type === 'item';
            
            if (photoRequired) {
                wx.navigateTo({
                    url: `/pages/taskProcess/taskProcess?id=${taskId}`
                });
                return;
            } else {
                this.showConfirmModal(taskId, 'delivered', userId, '确认送达', '确定将货物送到指定地点了吗？');
                return;
            }
        }
        
        // 3. 【其他动作：取消、确认完成 (确认收货)】
        if (actionType === 'cancel' || actionType === 'confirmreceipt') {
            const action = actionType === 'confirmreceipt' ? 'complete' : 'cancel';
            this.showConfirmModal(taskId, action, userId);
        }
    },
    
    /**
     * 弹出确认模态框 (用于 cancel, complete, delivered 且无需拍照)
     */
    showConfirmModal(taskId, actionType, userId, customTitle, customContent) {
        const title = customTitle || (actionType === 'cancel' ? '取消订单' : '确认完成');
        const content = customContent || (actionType === 'cancel' ? '确定要取消该订单吗？' : '确认收到货物并支付跑腿费吗？');

        wx.showModal({
            title: title,
            content: content,
            success: (res) => {
                if (res.confirm) {
                    this.executeAction(actionType, taskId, userId); // 调用 executeAction
                }
            }
        });
    },

    /**
     * 调用 API 发送订单操作请求 (封装为 Promise)
     * 修正：参数名与您之前提供的 JSON 结构一致：orderId, action, userId
     */
    sendActionRequest(taskId, actionType, userId, photoUrl = null) {
        const token = wx.getStorageSync('token');
        
        // 注意：您的后端接口是要求 orderId/operatorId 还是 taskId/userId，
        // 我们以您最新提供的 JSON 结构为准进行适配，但这里使用了您代码中的变量名。
        
        return new Promise((resolve, reject) => {
            wx.request({
                url: ACTION_URL,
                method: 'POST',
                data: {
                    orderId: taskId, // 使用 orderId 字段名
                    action: actionType, // 使用小写的 actionType (如 'accept')
                    userId: userId, // 使用 userId 字段名
                    ...(photoUrl && { photoUrl: photoUrl }) 
                },
                header: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                success: (res) => {
                    if (res.data.code === 0) {
                        resolve(res.data);
                    } else {
                        reject(new Error(res.data.message || '服务器错误'));
                    }
                },
                fail: (err) => {
                    reject(new Error('网络请求失败'));
                }
            });
        });
    },
    
    contactUser(e) {
        const userId = e.currentTarget.dataset.userId;
        // 实际应用中应调用联系电话或IM功能
        wx.showToast({ title: `联系用户 ${userId}`, icon: 'none' });
    }
});