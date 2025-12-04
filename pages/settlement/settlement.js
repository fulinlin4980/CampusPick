// pages/settlement/settlement.js

const BASE_URL = 'http://localhost:8080/v1'; 
const ORDER_DETAIL_URL = `${BASE_URL}/orders/detail`; // 假设有获取订单详情的接口
const ACTION_URL = `${BASE_URL}/orders/action`;

Page({
    data: {
        orderId: null,
        currentUserId: null,
        order: {},
        isSubmitting: false,
    },

    onLoad(options) {
        const orderId = options.id;
        const currentUserId = wx.getStorageSync('userId');
        
        if (!orderId || !currentUserId) {
            wx.showToast({ title: '参数或登录信息缺失', icon: 'error' });
            setTimeout(() => wx.navigateBack(), 1500);
            return;
        }

        this.setData({ orderId, currentUserId }, () => {
            this.fetchOrderDetail(orderId, currentUserId);
        });
    },

    /**
     * 【API CALL 1】获取订单详情，以便展示图片和跑腿员信息
     */
    fetchOrderDetail(orderId, userId) {
        wx.showLoading({ title: '加载订单信息...' });
        const token = wx.getStorageSync('token');

        wx.request({
            url: ORDER_DETAIL_URL,
            // 【核心修改点 1】: 必须使用 POST 方法
            method: 'POST', 
            // 【核心修改点 2】: 必须使用 orderId 字段名，并作为 JSON body 发送
            data: { 
                orderId: orderId 
            }, 
            header: { 
                'Content-Type': 'application/json', // 确保告知后端是 JSON
                'X-User-ID': userId, 
                'Authorization': `Bearer ${token}` 
            },
            success: (res) => {
                wx.hideLoading();
                if (res.data.code === 0 && res.data.data) {
                    // orderJson 中现在包含了 photoBase64 字段
                    this.setData({ order: res.data.data }); 
                } else {
                    wx.showToast({ title: '订单加载失败', icon: 'none' });
                }
            },
            fail: () => {
                wx.hideLoading();
                wx.showToast({ title: '网络错误', icon: 'none' });
            }
        });
    },

    previewImage() {
        const base64Data = this.data.order.photoBase64;
        if (!base64Data) {
            wx.showToast({ title: '暂无图片凭证', icon: 'none' });
            return;
        }

        wx.showLoading({ title: '准备预览...' });
        const fs = wx.getFileSystemManager();
        // 1. 将 Base64 字符串转换为 ArrayBuffer (wx.saveFileToDisk 需要 ArrayBuffer)
        const arrayBuffer = wx.base64ToArrayBuffer(base64Data);
        
        // 2. 将 ArrayBuffer 写入临时文件
        // 命名一个临时路径 (例如，使用时间戳)
        const tempFilePath = `${wx.env.USER_DATA_PATH}/preview_${Date.now()}.jpg`; 

        fs.writeFile({
            filePath: tempFilePath,
            data: arrayBuffer,
            encoding: 'binary',
            success: () => {
                wx.hideLoading();
                // 3. 预览本地文件
                wx.previewImage({
                    current: tempFilePath,
                    urls: [tempFilePath],
                    fail: (err) => {
                        console.error('预览失败', err);
                        wx.showToast({ title: '预览失败', icon: 'none' });
                    }
                });
            },
            fail: (err) => {
                wx.hideLoading();
                console.error('保存临时文件失败', err);
                wx.showToast({ title: '保存图片失败', icon: 'none' });
            }
        });
    },

    /**
     * 【核心】确认结算按钮点击事件：调用 /v1/orders/action
     */
    confirmSettlement() {
        if (this.data.isSubmitting) return;

        wx.showModal({
            title: '确认结算',
            content: `佣金 ¥${this.data.order.price.toFixed(2)} 将支付给接单人，是否确认？`,
            success: (res) => {
                if (res.confirm) {
                    this.executeConfirmAction();
                }
            }
        });
    },

    executeConfirmAction() {
        this.setData({ isSubmitting: true });
        wx.showLoading({ title: '正在完成结算...', mask: true });
        const token = wx.getStorageSync('token');
        const { orderId, currentUserId } = this.data;

        wx.request({
            url: ACTION_URL,
            method: 'POST',
            data: {
                orderId: orderId,
                action: 'confirm', // 对应后端 action == "confirm" 逻辑
                userId: currentUserId, 
            },
            header: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            success: (res) => {
                wx.hideLoading();
                if (res.data.code === 0) {
                    wx.showToast({ title: '结算成功！订单已完成', icon: 'success' });
                    // 通知“我的”页面刷新，并返回
                    wx.setStorageSync('shouldRefreshUserOrders', true); 
                    setTimeout(() => {
                        wx.navigateBack({ delta: 1 });
                    }, 1000);
                } else {
                    wx.showToast({ title: res.data.message || '结算失败', icon: 'none' });
                }
            },
            fail: () => {
                wx.hideLoading();
                wx.showToast({ title: '网络错误', icon: 'none' });
            }
        }).finally(() => {
            this.setData({ isSubmitting: false });
        });
    }
});