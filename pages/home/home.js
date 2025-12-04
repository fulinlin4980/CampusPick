// pages/home/home.js

// 假设任务状态枚举
const OrderStatus = {
    PENDING: 'PENDING', // 待接取
    ACCEPTED: 'ACCEPTED', // 已接取
    DELIVERED: 'DELIVERED', // 已送达
    COMPLETED: 'COMPLETED', // 已完成
    CANCELLED: 'CANCELLED' // 已取消
};

// API 配置
const BASE_URL = 'http://localhost:8080/v1'; // 请务必替换为实际的后端地址
const FEED_URL = `${BASE_URL}/orders/feed`;

Page({
    data: {
        filterText: '', // 搜索过滤关键词
        hotTags: ['一食堂', '快递', '南苑', '北苑'],
        allTaskList: [], // 存储所有加载的原始任务数据
        displayTaskList: [], // 存储经过搜索过滤后展示的任务数据
        loading: false,
        noMoreData: false, // 是否已加载全部数据
        page: 1,
        pageSize: 10
    },

    onLoad() {
        this.loadTasks(true); // 首次加载数据
    },
    
    /**
     * 【新增】：监听页面显示，用于检查是否需要从详情页返回后刷新
     */
    onShow() {
        const shouldRefresh = wx.getStorageSync('shouldRefreshTaskList');
        
        // 检查是否有刷新标记
        if (shouldRefresh) {
            console.log('[TaskHall] 检测到刷新标记，正在重新加载数据...');
            
            // 执行下拉刷新操作，重置所有数据并加载第一页
            this.setData({ 
                allTaskList: [], 
                page: 1, 
                filterText: '', 
                noMoreData: false 
            }, () => {
                this.loadTasks(true); 
            });
            
            // 立即清除标记，避免下次意外刷新
            wx.removeStorageSync('shouldRefreshTaskList'); 
        }
    },
    
    // ------------------------- 搜索与过滤逻辑 -------------------------

    // 搜索输入框变化事件
    handleSearchInput(e) {
        const filterText = e.detail.value;
        this.setData({ filterText }, () => {
            // 输入变化时，不需要重新加载 API，只在本地数据中过滤
            this.filterTasks();
        });
    },

    // 热门标签点击事件
    handleTagClick(e) {
        const tag = e.currentTarget.dataset.tag;
        this.setData({ filterText: tag }, () => {
            this.filterTasks();
        });
    },

    /**
     * 任务数据过滤函数：在本地 allTaskList 中根据关键词和状态进行过滤
     * @param {Array} [tasks=this.data.allTaskList] - 要过滤的数据源
     * @param {string} [text=this.data.filterText] - 过滤关键词
     */
    filterTasks(tasks = this.data.allTaskList, text = this.data.filterText) {
        const filterTextLower = text.toLowerCase();
        
        const filtered = tasks.filter(o => {
            // 1. 状态过滤：只显示 PENDING (待接取) 状态的任务
            if (o.status !== OrderStatus.PENDING) {
                return false;
            }
            
            // 2. 关键词过滤：匹配标题、地点或描述 (注意字段名可能与后端返回的结构有关)
            return (o.title && o.title.toLowerCase().includes(filterTextLower)) || 
                   (o.pickupLocation && o.pickupLocation.toLowerCase().includes(filterTextLower)) || // 使用实际的地点字段
                   (o.deliveryLocation && o.deliveryLocation.toLowerCase().includes(filterTextLower)) || 
                   (o.description && o.description.toLowerCase().includes(filterTextLower));
        });

        this.setData({
            displayTaskList: filtered
        });
    },

    // ------------------------- 数据加载逻辑 -------------------------

    /**
     * 调用 API 加载任务数据 (此函数相当于 loadTaskList)
     * @param {boolean} [isRefresh=false] - 是否为下拉刷新操作
     */
    loadTasks(isRefresh = false) {
        if (this.data.loading) return;
        if (!isRefresh && this.data.noMoreData) return;

        let currentPage = this.data.page;
        if (isRefresh) {
            currentPage = 1; // 刷新时重置页码
        }

        this.setData({ loading: true });
        if (isRefresh) {
            wx.showLoading({ title: '刷新中...' });
        }

        const token = wx.getStorageSync('token'); // 某些接口可能需要 token

        wx.request({
            url: FEED_URL,
            method: 'GET',
            data: {
                page: currentPage,
                pageSize: this.data.pageSize
            },
            header: { 
                'Content-Type': 'application/json',
                // 如果后端需要 Authorization 或其他 Header，请在此处添加
                // ...(token && { 'Authorization': `Bearer ${token}` }) 
            },
            success: (res) => {
                let newTasks = [];
                let hasMore = true;

                if (res.data.code === 0 && res.data.data && Array.isArray(res.data.data.items)) {
                    // 假设后端返回结构为 { code: 0, data: { items: [...], total: N } }
                    newTasks = res.data.data.items;
                    hasMore = newTasks.length === this.data.pageSize;
                } else {
                    // 处理 API 失败或数据结构错误
                    wx.showToast({ title: res.data.message || '加载失败', icon: 'error' });
                    hasMore = false;
                }

                const updatedAllList = isRefresh ? newTasks : this.data.allTaskList.concat(newTasks);

                this.setData({
                    allTaskList: updatedAllList,
                    loading: false,
                    page: currentPage + 1, // 准备加载下一页
                    noMoreData: !hasMore
                }, () => {
                    // 数据更新后，进行过滤和展示
                    this.filterTasks(updatedAllList, this.data.filterText);
                });
            },
            fail: (err) => {
                wx.showToast({ title: '网络请求失败', icon: 'error' });
                this.setData({ loading: false });
                console.error('API请求失败:', err);
            },
            complete: () => {
                wx.hideLoading();
                if (isRefresh) {
                    wx.stopPullDownRefresh();
                }
            }
        });
    },

    // 下拉刷新
    onPullDownRefresh() {
        // 重置数据和搜索，并触发首次加载
        this.setData({ 
            allTaskList: [], 
            page: 1, 
            filterText: '', 
            noMoreData: false 
        });
        this.loadTasks(true); 
    },

    // 上拉加载更多
    onReachBottom() {
        this.loadTasks(false);
    },

    // 跳转到任务详情
    goToDetail(e) {
        // 从本地存储获取 userId
        const userId = wx.getStorageSync('userId'); 

        // 🚨 登录检查逻辑 🚨
        if (!userId) { 
            wx.showModal({
                title: '操作受限',
                content: '请先登录才能进行任何操作（包括查看任务详情）。',
                confirmText: '去登录',
                cancelText: '取消',
                success: (res) => {
                    if (res.confirm) {
                        // 跳转到个人中心页面 (登录页面)
                        wx.reLaunch({
                            url: '/pages/profile/profile'
                        });
                    }
                }
            });
            return; // 阻止后续跳转代码执行
        }
        // 🚨 登录检查结束 🚨

        const taskId = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/orderDetail/orderDetail?id=${taskId}`
            
        });
    }
});