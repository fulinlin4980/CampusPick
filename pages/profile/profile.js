// pages/profile/profile.js

// 模拟常量和API基础配置
const BASE_URL = 'http://localhost:8080/v1';
const LOGIN_URL = `${BASE_URL}/auth/login`; 
const ACTION_URL= `${BASE_URL}/orders/action`; 
// 订单状态常量 (保持不变)
const OrderStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED' 
};

Page({
  data: {
    // 【新增】登录表单数据
    username: '', 
    password: '', 
    
    // 动态获取的用户信息
    currentUser: null, 
    userId: null,        
    isLoggedIn: false,   
    
    // 订单数据 (保持不变)
    allOrders: [],
    activeTab: 'published', 
    myPublished: [],
    myAccepted: [],
    displayOrders: [],

    publishedCount: 0,
    acceptedCount: 0,
  },
  goToRegister() {
    console.log('--- 正在尝试跳转到注册页面 ---'); // <--- 请添加这行！
    wx.navigateTo({
        url: '/pages/register/register',
    });
},
  onShow() {
    // 检查本地是否有用户ID，如果有则视为已登录，直接拉取数据
    const userId = wx.getStorageSync('userId');
    if (userId) {
      this.setData({ userId: userId, isLoggedIn: true });
      this.fetchUserProfile(userId);
      this.fetchUserOrders('published', userId);
      this.fetchUserOrders('accepted', userId);
      this.updateDisplayOrders();
    } else {
      this.setData({ isLoggedIn: false, userId: null });
    }
  },

  // 【新增】输入框绑定事件，将输入值存入 data
  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  // 【核心方法】处理用户名和密码登录
  handleLogin() {
    // 🚨 【关键检查点 1】: 添加日志
      console.log('--- handleLogin function called ---');
    const { username, password } = this.data;

    if (!username || !password) {
      wx.showToast({ title: '用户名和密码不能为空', icon: 'none' });
      return;
    }

    this.sendLoginDataToBackend(username, password);
  },

  // 【API CALL 1】发送登录数据到后端 (使用用户名和密码)
  sendLoginDataToBackend(username, password) {
    wx.showLoading({ title: '登录中...' });
    wx.request({
      url: LOGIN_URL,
      method: 'POST',
      data: {
        username,
        password
      },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 0) {
          const { userId, token, profile } = res.data.data;
          
          // 存储身份信息到本地，供后续使用
          wx.setStorageSync('userId', userId);
          wx.setStorageSync('token', token);
          
          this.setData({
            userId,
            currentUser: profile,
            isLoggedIn: true,
            password: '' // 登录成功后清空密码输入框
          });
          wx.showToast({ title: '登录成功', icon: 'success' });

          this.fetchUserOrders('published', userId);
          this.fetchUserOrders('accepted', userId);
        } else {
          wx.showToast({ title: `登录失败: ${res.data.message || '用户名或密码错误'}`, icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        // 🚨 临时添加日志，查看失败的详细原因
        console.error('API请求失败详情:', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // 【API CALL 2】获取用户信息 (保持不变，使用动态 userId)
  fetchUserProfile(userId) {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${BASE_URL}/user/profile`,
      method: 'GET',
      header: { 'X-User-ID': userId, 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.data.code === 0) {
          this.setData({ currentUser: res.data.data });
        }
      }
    });
  },

  // 【API CALL 3】获取用户的订单 (保持不变，使用动态 userId)
  fetchUserOrders(type, userId) {
    if (!userId) return; 
    const token = wx.getStorageSync('token');

    wx.request({
      url: `${BASE_URL}/orders/mine`,
      method: 'GET',
      data: { userId, type },
      header: { 'X-User-ID': userId, 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.data.code === 0) {
          const orders = res.data.data.sort((a, b) => b.createdAt - a.createdAt);
          if (type === 'published') {
            this.setData({ myPublished: orders, publishedCount: orders.length });
          } else {
            this.setData({ myAccepted: orders, acceptedCount: orders.length });
          }
          if (this.data.activeTab === type) {
             this.updateDisplayOrders();
          }
        }
      },
      fail: () => {
        wx.showToast({ title: '获取订单网络错误', icon: 'none' });
      }
    });
  },
  
  // Tab 切换事件处理 (保持不变)
  handleTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab }, this.updateDisplayOrders);
  },

  updateDisplayOrders() {
    const { activeTab, myPublished, myAccepted } = this.data;
    const displayOrders = activeTab === 'published' ? myPublished : myAccepted;
    this.setData({ displayOrders: displayOrders });
  },
// 【修改点 1】: 订单操作执行逻辑
executeOrderAction(orderId, action, userId, currentTab) {
    this.setData({ isActionLoading: true });
    wx.showLoading({ title: '处理中...' });

    // 注意：取消操作可能需要用户输入原因，但简化处理中先忽略原因字段。
    const actionPayload = {
        orderId: orderId,
        action: action === 'cancel' ? 'cancel' : 'complete', // 确保 action 是后端期望的小写或大写
        userId: userId,
        // 如果是取消操作，可以在这里添加 reason 字段
        // reason: '' 
    };

    this.sendActionRequest(actionPayload)
        .then(() => {
            wx.hideLoading();
            const successMsg = action === 'cancel' ? '订单已取消' : '操作成功';
            wx.showToast({ title: successMsg, icon: 'success' });
            
            // 成功后刷新当前 Tab 的订单列表
            this.fetchUserOrders(currentTab, userId); 
        })
        .catch(error => {
            wx.hideLoading();
            console.error('订单操作失败:', error);
            wx.showToast({ title: error.message || '操作失败，请重试', icon: 'none' });
        })
        .finally(() => {
            this.setData({ isActionLoading: false });
        });
},

/**
 * 【修改点 2】: 调用 API 发送订单操作请求 (POST /v1/orders/action)
 * @param {Object} payload - 包含 orderId, action, userId, [reason] 等字段
 */
sendActionRequest(payload) {
    const token = wx.getStorageSync('token');
    
    return new Promise((resolve, reject) => {
        wx.request({
            url: ACTION_URL, // 确保 ACTION_URL 已定义
            method: 'POST',
            data: payload, // 直接发送完整的 payload
            header: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            success: (res) => {
                if (res.data.code === 0) {
                    resolve(res.data);
                } else {
                    reject(new Error(res.data.message || '操作失败'));
                }
            },
            fail: (err) => {
                reject(new Error('网络请求失败'));
            }
        });
    });
},
// 订单操作事件处理 - 触发 API 调用
handleAction(e) {
    if (this.data.isActionLoading) return; // 防重复点击

    const { userId, activeTab } = this.data;
    if (!userId) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
    }

    const orderId = e.currentTarget.dataset.orderId;
    const action = e.currentTarget.dataset.action; // 'cancel' 或 'complete'
    
// ==========================================================
    // 【修改点 1：拦截 'complete' 动作，改为跳转到图片处理页】
    if (action === 'complete' && activeTab === 'accepted') {
        console.log(`[Profile] 跳转到任务处理页进行拍照，ID: ${orderId}`);
        wx.navigateTo({
            url: `/pages/taskProcess/taskProcess?id=${orderId}`
        });
        return; 
    }
    
    // 【新增拦截点 2：拦截 'settle' 动作，跳转到结算页】
    if (action === 'settle' && activeTab === 'published') {
        console.log(`[Profile] 跳转到结算页，ID: ${orderId}`);
        wx.navigateTo({
            url: `/pages/settlement/settlement?id=${orderId}` // 🚨 新增结算页面
        });
        return; 
    }
    // ==========================================================

    // ==========================================================
    // 【核心修改点：拦截 'complete' 动作，改为跳转到图片处理页】
    if (action === 'complete' && activeTab === 'accepted') {
        console.log(`[Profile] 跳转到任务处理页进行拍照，ID: ${orderId}`);
        // 跳转到新的任务处理页面，并带上订单 ID
        wx.navigateTo({
            url: `/pages/taskProcess/taskProcess?id=${orderId}`
        });
        return; // 阻止后续的 Modal 弹窗和直接 API 调用
    }
    // ==========================================================

    let title, content;
    
    if (action === 'cancel') {
        title = '取消订单';
        content = '确定要取消您发布的这个订单吗？';
    } else if (action === 'complete') {
        // 这个分支理论上只对不需要拍照的“完成”操作生效，但由于我们已在上部拦截，这里可忽略
        title = '确认送达';
        content = '确认您已经将订单送达了吗？';
    } else {
        return; // 未知动作
    }
    
    // 弹出确认模态框，然后执行 executeOrderAction (用于 'cancel' 动作)
    wx.showModal({
        title: title,
        content: content,
        success: (res) => {
            if (res.confirm) {
                this.executeOrderAction(orderId, action, userId, activeTab);
            }
        }
    });
},
  
  // 【新增】登出功能
  handleLogout() {
      wx.clearStorageSync(); // 清除所有本地存储的登录信息
      this.setData({
          userId: null,
          currentUser: null,
          isLoggedIn: false,
          displayOrders: [],
          myAccepted: [],
          myPublished: [],
          username: '',
          password: ''
      });
      wx.showToast({ title: '已安全退出', icon: 'none' });
  }
})