// pages/taskProcess/taskProcess.js

// 🚨 替换为您的 API 地址
const BASE_URL = 'http://localhost:8080/v1'; 
const ACTION_URL = `${BASE_URL}/orders/action`;  // 订单操作接口

Page({
    data: {
        taskId: null,
        currentUserId: null,
        photoUrl: '', // 存储图片在本地的临时路径
        remarks: '',
        isSubmitting: false,
    },

    onLoad(options) {
        // ... (初始化逻辑保持不变) ...
        const taskId = options.id;
        const currentUserId = wx.getStorageSync('userId');
        
        if (!taskId || !currentUserId) {
            wx.showToast({ title: '参数或登录信息缺失', icon: 'error' });
            setTimeout(() => wx.navigateBack(), 1500);
            return;
        }

        this.setData({ taskId, currentUserId });
    },

    // ------------------------- 图片处理 (chooseImage/removeImage/previewImage 保持不变) -------------------------
    chooseImage() {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath;
                this.setData({ photoUrl: tempFilePath });
            },
            fail: (err) => {
                console.error('选择图片失败', err);
                wx.showToast({ title: '选择图片失败', icon: 'none' });
            }
        });
    },

    removeImage() {
        this.setData({ photoUrl: '' });
    },

    previewImage() {
        if (this.data.photoUrl) {
            wx.previewImage({
                urls: [this.data.photoUrl],
            });
        }
    },

    // ------------------------- 备注处理 (handleRemarksInput 保持不变) -------------------------
    handleRemarksInput(e) {
        this.setData({ remarks: e.detail.value });
    },

    // ------------------------- 提交操作 -------------------------

    /**
     * 【核心】提交按钮点击事件
     */
    submitAction() {
        if (!this.data.photoUrl) {
            wx.showToast({ title: '请上传送达照片', icon: 'none' });
            return;
        }
        
        this.setData({ isSubmitting: true });
        wx.showLoading({ title: '正在读取照片...' });

        // 1. 读取本地文件并转换为 Base64
        this.readImageAsBase64(this.data.photoUrl)
            .then(base64Data => {
                wx.hideLoading();
                wx.showLoading({ title: '正在提交任务...', mask: true });
                
                // 2. 调用订单动作 API，包含 Base64 数据
                return this.sendActionRequest(base64Data);
            })
            .then(() => {
                wx.hideLoading();
                wx.showToast({ title: '任务提交成功', icon: 'success' });

                // 3. 设置任务列表刷新标记，并返回上一页
                wx.setStorageSync('shouldRefreshUserOrders', true); 
                setTimeout(() => {
                    wx.navigateBack({ delta: 1 });
                }, 1000);
            })
            .catch(error => {
                wx.hideLoading();
                this.setData({ isSubmitting: false });
                wx.showToast({ title: error.message || '操作失败，请重试', icon: 'none' });
            });
    },
    
    /**
     * 【辅助函数】读取本地文件并转换为 Base64
     */
    readImageAsBase64(filePath) {
        const fs = wx.getFileSystemManager();
        return new Promise((resolve, reject) => {
            fs.readFile({
                filePath: filePath,
                encoding: 'base64',
                success: (res) => resolve(res.data),
                fail: (err) => {
                    console.error('读取本地文件失败:', err);
                    reject(new Error('读取照片失败'));
                }
            });
        });
    },

    /**
     * 【API CALL】调用订单动作接口，将 Base64 数据包含在请求中
     */
    sendActionRequest(base64Data) {
        const token = wx.getStorageSync('token');
        const { taskId, currentUserId, remarks } = this.data;
        
        return new Promise((resolve, reject) => {
            wx.request({
                url: ACTION_URL,
                method: 'POST',
                data: {
                    orderId: taskId,
                    action: 'deliver', // 动作类型
                    userId: currentUserId, 
                    photoData: base64Data, // 【核心】：传入 Base64 字符串
                    remarks: remarks 
                },
                header: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                success: (res) => {
                    if (res.data.code === 0) {
                        resolve(res.data);
                    } else {
                        reject(new Error(res.data.message || '任务提交失败'));
                    }
                },
                fail: (err) => {
                    reject(new Error('订单操作网络请求失败'));
                }
            });
        });
    }
});