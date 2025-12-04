// pages/register/register.js

const BASE_URL = 'http://localhost:8080/v1';
const REGISTER_URL = `${BASE_URL}/auth/register`;

Page({
  data: {
    username: '', // 登录名/手机号
    password: '', // 密码
    name: '',     // 昵称
  },
  goToLogin() {
    // 因为是从 profile 页面跳转到 register 页面，
    // 使用 wx.navigateBack 可以返回到上一个页面，即 profile 页面（登录界面）
    wx.navigateBack({
      delta: 1, // 返回上一页
      fail: () => {
          // 如果用户直接从其他地方进入注册页（例如分享），navigateBack 会失败，
          // 此时使用 reLaunch 确保能回到 profile 页面
          wx.reLaunch({
              url: '/pages/profile/profile',
          });
      }
    });
  },
  // 统一的输入绑定事件
  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  // 【核心方法】处理注册逻辑
  handleRegister() {
    const { username, password, name } = this.data;
    console.log('--- 注册页面 ---'); // <--- 请添加这行！
    if (!username || !password || !name) {
      wx.showToast({ title: '所有字段都必须填写', icon: 'none' });
      return;
    }
    
    if (password.length < 6) {
        wx.showToast({ title: '密码长度至少为6位', icon: 'none' });
        return;
    }

    wx.showLoading({ title: '注册中...' });
    
    // 【API CALL】发送注册数据到后端
    wx.request({
      url: REGISTER_URL,
      method: 'POST',
      data: {
        username,
        password,
        name
      },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 0) {
          const { userId, token } = res.data.data;
          
          // 1. 存储登录凭证
          wx.setStorageSync('userId', userId);
          wx.setStorageSync('token', token);
          
          wx.showToast({ title: '注册成功并自动登录', icon: 'success' });

          // 2. 注册成功后，跳转回个人中心（或首页）
          // 使用 reLaunch 关闭所有页面并打开新页面，确保登录状态生效
          wx.reLaunch({
            url: '/pages/profile/profile',
          });
          
        } else {
          wx.showToast({ title: `注册失败: ${res.data.message || '用户名已存在或网络错误'}`, icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      }
    });
  }
})