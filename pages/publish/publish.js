// pages/publish/publish.js

// 模拟常量和API基础配置
const BASE_URL = 'http://localhost:8080/v1';
const PUBLISH_ORDER_URL = `${BASE_URL}/orders/publish`;

Page({
    data: {
        // 核心表单数据
        type: 'express',      // 需求类型：express, food, item (默认快递代取)
        pickup: '',           // 取货地点 (输入框)
        delivery: '',         // 送达地点 (输入框)
        pickupCode: '',       // 快递取件码 (仅 type='express' 时显示)
        price: '',            // 跑腿费用 (数字，类型为字符串以便输入)
        desc: '',             // 备注/详细描述
        
        // 状态数据
        userId: null,         // 当前登录用户ID
        isLoading: false,     // 按钮加载状态
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad() {
        // 在页面加载时检查用户是否登录
        const userId = wx.getStorageSync('userId');
        if (!userId) {
            wx.showModal({
                title: '请先登录',
                content: '发布订单需要登录您的账号。',
                showCancel: false,
                success: () => {
                    // 跳转回个人中心/登录页
                    wx.reLaunch({
                        url: '/pages/profile/profile',
                    });
                }
            });
        } else {
            this.setData({ userId: userId });
        }
    },

    /**
     * 统一的输入和选择绑定事件 (兼容 input, textarea, radio-group)
     * 用于更新 data 里的所有字段
     */
    handleInputChange(e) {
        const field = e.currentTarget.dataset.field;
        // 对于 radio-group，e.detail.value 是选中的 value 字符串
        // 对于 input/textarea，e.detail.value 是输入值
        this.setData({
            [field]: e.detail.value
        });
    },

    /**
     * 核心方法：处理订单发布逻辑 (对应 WXML 中的 bind:tap="handleSubmit")
     */
    handleSubmit() {
        if (this.data.isLoading) return;

        const { type, pickup, delivery, pickupCode, price, desc, userId } = this.data;

        // 1. 登录检查
        if (!userId) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
        }

        // 2. 表单验证
        if (!pickup || !delivery || !price || !desc) {
            wx.showToast({ title: '请填写完整的订单信息', icon: 'none' });
            return;
        }

        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice) || numericPrice < 0.5) {
            wx.showToast({ title: '跑腿费必须大于0.5元', icon: 'none' });
            return;
        }
        
        if (type === 'express' && !pickupCode) {
            wx.showToast({ title: '请填写快递取件码', icon: 'none' });
            return;
        }

        // 3. 构建请求体
        const requestData = {
            creatorId: userId,
            type: type, // 假设后端使用大写枚举
            pickupLocation: pickup,
            deliveryLocation: delivery,
            price: numericPrice,
            description: desc,
            // 只有快递类型才发送取件码
            ...(type === 'express' && { notes: pickupCode }) 
        };

        this.sendPublishRequest(requestData);
    },

    /**
     * 调用 API 发布订单
     */
    sendPublishRequest(data) {
        const token = wx.getStorageSync('token');

        this.setData({ isLoading: true });
        wx.showLoading({ title: '发布中...' });

        wx.request({
            url: PUBLISH_ORDER_URL,
            method: 'POST',
            data: data,
            header: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            success: (res) => {
                wx.hideLoading();
                this.setData({ isLoading: false });

                if (res.data.code === 0) {
                    wx.showToast({ title: '订单发布成功', icon: 'success' });
                    
                    // 成功后跳转到首页或订单列表
                    wx.switchTab({
                        url: '/pages/index/index', // 假设你的首页是 index
                    });
                } else {
                    wx.showToast({ title: `发布失败: ${res.data.message || '服务器错误'}`, icon: 'none' });
                }
            },
            fail: (err) => {
                wx.hideLoading();
                this.setData({ isLoading: false });
                console.error('发布订单请求失败:', err);
                wx.showToast({ title: '网络请求失败', icon: 'none' });
            }
        });
    }
});