// 自在东方 - 单页面应用路由系统

class ZizaiDongfangApp {
    constructor() {
        this.currentPage = 'home';
        this.pages = {
            'home': 'home',
            'world': 'world',
            'social': 'social',
            'profile': 'profile'
        };
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupRouter();
        this.setupPullToRefresh();
        
        const loadInitialPage = () => {
            const initialPage = window.location.hash.slice(1) || 'home';
            this.navigateTo(initialPage);
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadInitialPage);
        } else {
            loadInitialPage();
        }
    }

    setupRouter() {
        window.addEventListener('hashchange', () => {
            const page = window.location.hash.slice(1) || 'home';
            if (page !== this.currentPage) {
                this.navigateTo(page);
            }
        });
    }

    navigateTo(page) {
        if (!this.pages[page]) {
            page = 'home';
        }
        
        if (page === this.currentPage) {
            return;
        }
        
        this.currentPage = page;
        this.updateNavigation(page);
        this.loadPage(page);
        window.history.pushState({}, '', `#${page}`);
    }

    async loadPage(page) {
        const container = document.getElementById('app-container');
        if (!container) return;

        try {
            container.innerHTML = '<div class="flex items-center justify-center h-full min-h-screen"><div class="text-center"><i class="fas fa-spinner fa-spin text-4xl text-red-600 mb-4"></i><p class="text-gray-600">加载中...</p></div></div>';

            const response = await fetch(`${page}.html`);
            if (!response.ok) throw new Error('页面加载失败');
            
            const html = await response.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            const pageContent = tempDiv.querySelector('.iphone-screen') || tempDiv.querySelector('.page-content');
            if (pageContent) {
                const statusBar = pageContent.querySelector('.h-8.bg-white, .h-8.bg-transparent');
                const mainContent = pageContent.querySelector('.page-content') || pageContent;
                
                let newHTML = '';
                if (statusBar) {
                    newHTML += `<div class="status-bar-wrapper" style="position: sticky; top: 0; z-index: 50; background: white; border-bottom: 1px solid #e0e0e0;">${statusBar.outerHTML}</div>`;
                }
                if (mainContent && mainContent.classList.contains('page-content')) {
                    newHTML += mainContent.outerHTML;
                } else if (mainContent) {
                    newHTML += `<div class="page-content" style="padding-bottom: 80px;">${mainContent.innerHTML}</div>`;
                }
                
                container.innerHTML = newHTML;
                container.scrollTop = 0;
                
                const pageContentElement = container.querySelector('.page-content');
                if (pageContentElement) {
                    const computedStyle = window.getComputedStyle(pageContentElement);
                    const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;
                    if (paddingBottom < 80) {
                        pageContentElement.style.paddingBottom = '80px';
                    }
                }
                
                setTimeout(() => {
                    this.initPageFeatures(page);
                    this.bindPageLinks();
                }, 100);
            }
        } catch (error) {
            console.error('加载页面失败:', error);
            container.innerHTML = '<div class="flex items-center justify-center h-full min-h-screen"><div class="text-center text-red-600"><i class="fas fa-exclamation-circle text-4xl mb-4"></i><p>页面加载失败</p></div></div>';
        }
    }

    initPageFeatures(page) {
        switch(page) {
            case 'world':
                this.initWorldPage();
                break;
            case 'social':
                this.initSocialPage();
                break;
        }
    }

    initWorldPage() {
        const tabItems = document.querySelectorAll('.world-tab-item');
        if (tabItems.length > 0) {
            tabItems.forEach((item) => {
                const existingHandler = item.onclick;
                item.addEventListener('click', (e) => {
                    if (existingHandler) return; // 如果已有处理函数，则不重复绑定
                    const tab = item.dataset.tab;
                    tabItems.forEach(tab => tab.classList.remove('active'));
                    item.classList.add('active');
                    
                    const offlineView = document.getElementById('offline-view');
                    const digitalView = document.getElementById('digital-twin-view');
                    
                    if (tab === 'offline') {
                        offlineView?.classList.remove('hidden');
                        digitalView?.classList.add('hidden');
                    } else if (tab === 'digital') {
                        offlineView?.classList.add('hidden');
                        digitalView?.classList.remove('hidden');
                    }
                });
            });
        }
    }

    initSocialPage() {
        const tabItems = document.querySelectorAll('.social-tab-item');
        if (tabItems.length > 0) {
            tabItems.forEach((item) => {
                const existingHandler = item.onclick;
                item.addEventListener('click', (e) => {
                    if (existingHandler) return;
                    const tab = item.dataset.tab;
                    tabItems.forEach(tab => tab.classList.remove('active'));
                    item.classList.add('active');
                    
                    const feedView = document.getElementById('feed-view');
                    const matchView = document.getElementById('match-view');
                    const circleView = document.getElementById('circle-view');
                    
                    if (feedView && matchView && circleView) {
                        feedView.classList.toggle('hidden', tab !== 'feed');
                        matchView.classList.toggle('hidden', tab !== 'match');
                        circleView.classList.toggle('hidden', tab !== 'circle');
                    }
                });
            });
        }
    }

    setupNavigation() {
        const self = this;
        const handleNavClick = function(e) {
            const tabItem = e.target.closest('.tab-bar-item');
            if (tabItem && tabItem.dataset.page) {
                const page = tabItem.dataset.page;
                if (page !== self.currentPage) {
                    self.navigateTo(page);
                }
            }
        };
        
        const mainTabBar = document.getElementById('main-tab-bar');
        if (mainTabBar && !mainTabBar.dataset.listenerAdded) {
            mainTabBar.addEventListener('click', handleNavClick, true);
            mainTabBar.dataset.listenerAdded = 'true';
        }
    }

    updateNavigation(page) {
        const mainNavItems = document.querySelectorAll('#main-tab-bar .tab-bar-item');
        mainNavItems.forEach(item => {
            if (item.dataset.page === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    setupPullToRefresh() {
        let startY = 0;
        let isPulling = false;
        let pullDistance = 0;
        
        const handleTouchStart = (e) => {
            const container = document.getElementById('app-container');
            if (!container) return;
            const scrollTop = container.scrollTop || document.documentElement.scrollTop || window.pageYOffset;
            if (scrollTop === 0) {
                startY = e.touches[0].clientY;
                isPulling = false;
            }
        };

        const handleTouchMove = (e) => {
            if (startY === 0) return;
            const container = document.getElementById('app-container');
            if (!container) return;
            
            const currentY = e.touches[0].clientY;
            const scrollTop = container.scrollTop || document.documentElement.scrollTop || window.pageYOffset;
            
            if (scrollTop === 0 && currentY > startY) {
                pullDistance = currentY - startY;
                if (pullDistance > 10) {
                    isPulling = true;
                    e.preventDefault();
                }
            }
        };

        const handleTouchEnd = () => {
            if (isPulling && pullDistance > 80) {
                this.refreshPage();
            }
            startY = 0;
            isPulling = false;
            pullDistance = 0;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
    }

    async refreshPage() {
        await this.loadPage(this.currentPage);
    }

    bindPageLinks() {
        document.querySelectorAll('[data-nav]').forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                const page = element.getAttribute('data-nav');
                if (page) {
                    this.navigateTo(page);
                }
            });
        });
        
        document.querySelectorAll('.quick-action-card[onclick]').forEach(element => {
            const onclick = element.getAttribute('onclick');
            if (onclick && onclick.includes('character-test')) {
                element.onclick = () => {
                    window.location.href = 'character-test.html';
                };
            } else if (onclick && onclick.includes('my-script')) {
                element.onclick = () => {
                    window.location.href = 'my-script.html';
                };
            }
        });
    }
}

let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new ZizaiDongfangApp();
        window.app = app;
    });
} else {
    app = new ZizaiDongfangApp();
    window.app = app;
}

window.ZizaiDongfangApp = ZizaiDongfangApp;
