// pages/confirmAccept/confirmAccept.js

const BASE_URL = 'http://localhost:8080/v1'; 
// 使用新的 POST 详情接口
const DETAIL_URL = `${BASE_URL}/orders/detail`; 
const ACTION_URL = `${BASE_URL}/orders/action`;

Page({
    data: {
        task: null,
        taskId: null,
        currentUserId: null,
        isActionLoading: false
    },

    onLoad(options) {
        const taskId = options.id;
        const currentUserId = wx.getStorageSync('userId');
        
        this.setData({ 
            taskId: taskId,
            currentUserId: currentUserId
        });
        
        if (taskId && currentUserId) {
            this.loadTaskDetail(taskId);
        } else if (!currentUserId) {
            wx.showToast({ title: '请先登录', icon: 'error' });
            setTimeout(() => { wx.navigateBack(); }, 1500);
        }
    },
    
    /**
     * 调用新的 POST /v1/orders/detail 接口加载任务详情
     */
    loadTaskDetail(taskId) {
        wx.showLoading({ title: '加载任务信息' });
        
        wx.request({
            url: DETAIL_URL, 
            method: 'POST', // 使用 POST 方法
            data: { orderId: taskId }, // ID 放在 Body 中
            success: (res) => {
                wx.hideLoading();
                // 假设成功返回 code: 0, data: { ... }
                if (res.data.code === 0 && res.data.data) {
                    const taskDetail = res.data.data;
                    
                    // 再次检查状态，确保是 PENDING 才能接单
                    if (taskDetail.status !== 'PENDING') {
                         wx.showToast({ title: '任务已被接取或取消', icon: 'none' });
                         setTimeout(() => { wx.navigateBack(); }, 1500);
                         return;
                    }

                    this.setData({
                        task: taskDetail
                    });
                } else {
                    wx.showToast({ title: res.data.message || '任务信息加载失败', icon: 'none' });
                    setTimeout(() => { wx.navigateBack(); }, 1500);
                }
            },
            fail: () => {
                wx.hideLoading();
                wx.showToast({ title: '网络错误', icon: 'none' });
            }
        });
    },

    /**
     * 核心功能：点击“确认接单”按钮，调用 POST /v1/orders/action 接口
     */
    confirmAccept() {
        if (this.data.isActionLoading) return;
        
        const { taskId, currentUserId } = this.data;
        const token = wx.getStorageSync('token');

        this.setData({ isActionLoading: true });
        wx.showLoading({ title: '接单中...' });

        wx.request({
            url: ACTION_URL,
            method: 'POST',
            data: {
                orderId: taskId,
                action: 'ACCEPT', // 对应后端的 action 字段
                userId: currentUserId // 对应后端的 runnerId/userId 字段
            },
            header: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            success: (res) => {
                wx.hideLoading();
                this.setData({ isActionLoading: false });

                if (res.data.code === 0) {
                    wx.showToast({ title: '接单成功！', icon: 'success' });
                    
                    // 接单成功后，返回任务详情页（状态会更新为 ACCEPTED）
                    wx.redirectTo({
                        url: `/pages/orderDetail/orderDetail?id=${taskId}`
                    });
                } else {
                    wx.showToast({ title: res.data.message || '接单失败', icon: 'none' });
                }
            },
            fail: () => {
                wx.hideLoading();
                this.setData({ isActionLoading: false });
                wx.showToast({ title: '网络请求失败', icon: 'error' });
            }
        });
    }
});