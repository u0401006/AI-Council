# Firebase 實作方案

## 方案概述

從原本的 SQLite + AsyncStorage 本地儲存改為 Firebase 雲端架構：
- **Firebase Authentication**：使用者註冊/登入
- **Firebase Firestore**：雲端資料庫（支援即時同步與離線模式）
- **Firebase Storage**：大型檔案儲存
- **白名單機制**：控制使用者存取權限

---

## 1. Firebase Authentication 實作

### 1.1 使用者註冊/登入

```typescript
// src/services/firebase/auth.ts

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // 初始化 Firestore 使用者文件
    await firestore().collection('users').doc(user.uid).set({
      email: user.email,
      createdAt: firestore.FieldValue.serverTimestamp(),
      whitelisted: false, // 預設非白名單
    });
    
    return user;
  } catch (error) {
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const signOut = async () => {
  await auth().signOut();
};

export const getCurrentUser = () => {
  return auth().currentUser;
};

// 監聽認證狀態
export const onAuthStateChanged = (callback: (user: any) => void) => {
  return auth().onAuthStateChanged(callback);
};
```

### 1.2 AuthContext

```typescript
// src/contexts/AuthContext.tsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, getCurrentUser } from '../services/firebase/auth';
import { checkUserWhitelisted } from '../services/firebase/whitelist';

interface AuthState {
  user: any | null;
  loading: boolean;
  isWhitelisted: boolean;
}

interface AuthContextValue extends AuthState {
  refreshWhitelistStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isWhitelisted: false,
  });
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (user) => {
      if (user) {
        const whitelisted = await checkUserWhitelisted(user.uid);
        setState({ user, loading: false, isWhitelisted: whitelisted });
      } else {
        setState({ user: null, loading: false, isWhitelisted: false });
      }
    });
    
    return unsubscribe;
  }, []);
  
  const refreshWhitelistStatus = async () => {
    const user = getCurrentUser();
    if (user) {
      const whitelisted = await checkUserWhitelisted(user.uid);
      setState(prev => ({ ...prev, isWhitelisted: whitelisted }));
    }
  };
  
  return (
    <AuthContext.Provider value={{ ...state, refreshWhitelistStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

## 2. 白名單機制

### 2.1 Firestore 白名單集合結構

```typescript
// Collection: whitelist
{
  userId: {
    email: "user@example.com",
    uid: "firebase_uid_here",
    whitelisted: true,
    addedAt: Timestamp,
    addedBy: "admin_uid",
    tier: "free" | "pro" | "enterprise",
    quotas: {
      dailyRequests: 100,
      usedToday: 45,
      lastReset: Timestamp
    }
  }
}
```

### 2.2 白名單檢查邏輯

```typescript
// src/services/firebase/whitelist.ts

import firestore from '@react-native-firebase/firestore';

export const checkUserWhitelisted = async (uid: string): Promise<boolean> => {
  try {
    const doc = await firestore().collection('whitelist').doc(uid).get();
    
    if (!doc.exists) return false;
    
    const data = doc.data();
    return data?.whitelisted === true;
  } catch (error) {
    console.error('Whitelist check error:', error);
    return false;
  }
};

export const getUserTier = async (uid: string): Promise<string> => {
  try {
    const doc = await firestore().collection('whitelist').doc(uid).get();
    return doc.data()?.tier || 'free';
  } catch (error) {
    return 'free';
  }
};

export const checkQuota = async (uid: string): Promise<boolean> => {
  try {
    const doc = await firestore().collection('whitelist').doc(uid).get();
    const data = doc.data();
    
    if (!data) return false;
    
    const { dailyRequests, usedToday, lastReset } = data.quotas;
    
    // 檢查是否需要重置配額（每日重置）
    const now = new Date();
    const resetDate = lastReset.toDate();
    const shouldReset = now.getDate() !== resetDate.getDate();
    
    if (shouldReset) {
      await firestore().collection('whitelist').doc(uid).update({
        'quotas.usedToday': 0,
        'quotas.lastReset': firestore.FieldValue.serverTimestamp()
      });
      return true;
    }
    
    return usedToday < dailyRequests;
  } catch (error) {
    return false;
  }
};

export const incrementQuota = async (uid: string): Promise<void> => {
  await firestore().collection('whitelist').doc(uid).update({
    'quotas.usedToday': firestore.FieldValue.increment(1)
  });
};
```

---

## 3. Firestore 資料結構

### 3.1 使用者設定

```typescript
// Collection: users/{userId}/settings
{
  models: ['openai/gpt-4o', 'anthropic/claude-sonnet-4.5'],
  chairmanModel: 'anthropic/claude-sonnet-4.5',
  enableReview: true,
  outputStyle: 'balanced',
  customPrompts: {
    review: '...',
    chairman: '...'
  },
  updatedAt: Timestamp
}
```

### 3.2 對話歷史

```typescript
// Collection: users/{userId}/conversations
{
  id: 'conv_xxx',
  title: 'Chat Title',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  messages: [
    {
      role: 'user' | 'assistant',
      content: '...',
      timestamp: Timestamp
    }
  ],
  metadata: {
    totalCost: 0.05,
    models: ['gpt-4o', 'claude-sonnet-4.5']
  }
}

// Subcollection: conversations/{convId}/contexts
{
  id: 'ctx_xxx',
  type: 'text' | 'file' | 'url',
  content: '...',
  filename?: 'document.pdf',
  addedAt: Timestamp
}
```

### 3.3 任務管理

```typescript
// Collection: users/{userId}/tasks
{
  id: 'task_xxx',
  title: 'Task Title',
  description: '...',
  status: 'pending' | 'in_progress' | 'completed',
  parentId: null | 'task_yyy',
  children: ['task_zzz'],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 3.4 Canvas 文件

```typescript
// Collection: users/{userId}/canvases
{
  id: 'canvas_xxx',
  title: 'Document Title',
  content: '...markdown content...',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  metadata: {
    wordCount: 1500,
    lastEditedBy: 'user' | 'ai'
  }
}

// 如果內容超過 1MB，使用 Firebase Storage
// Path: users/{userId}/canvases/{canvasId}.md
```

---

## 4. Firebase Storage（大型檔案）

```typescript
// src/services/firebase/storage.ts

import storage from '@react-native-firebase/storage';

export const uploadCanvas = async (
  userId: string,
  canvasId: string,
  content: string
): Promise<string> => {
  const ref = storage().ref(`users/${userId}/canvases/${canvasId}.md`);
  await ref.putString(content);
  return await ref.getDownloadURL();
};

export const downloadCanvas = async (
  userId: string,
  canvasId: string
): Promise<string> => {
  const ref = storage().ref(`users/${userId}/canvases/${canvasId}.md`);
  return await ref.getDownloadURL();
};
```

---

## 5. 離線支援

### 5.1 啟用 Firestore 離線持久化

```typescript
// src/config/firebase.ts

import firestore from '@react-native-firebase/firestore';

export const initFirestore = async () => {
  // 啟用離線持久化
  await firestore().settings({
    persistence: true,
    cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED
  });
};
```

### 5.2 即時同步監聽

```typescript
// src/services/storage/conversations.ts

import firestore from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

export const useConversations = (userId: string) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .orderBy('updatedAt', 'desc')
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setConversations(data);
          setLoading(false);
        },
        error => {
          console.error('Firestore sync error:', error);
          setLoading(false);
        }
      );
    
    return unsubscribe;
  }, [userId]);
  
  return { conversations, loading };
};
```

---

## 6. Backend 整合

### 6.1 Firebase Admin SDK 初始化

```typescript
// backend/src/firebase/admin.ts

import * as admin from 'firebase-admin';

// 使用服務帳戶金鑰
const serviceAccount = require('../../firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-project.firebaseio.com'
});

export const auth = admin.auth();
export const firestore = admin.firestore();
```

### 6.2 認證中介層

```typescript
// backend/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebase/admin';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    // 驗證 Firebase ID Token
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // 附加至 request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 6.3 白名單中介層

```typescript
// backend/src/middleware/whitelist.ts

import { Request, Response, NextFunction } from 'express';
import { firestore } from '../firebase/admin';

export const whitelistMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.uid;
    
    const doc = await firestore.collection('whitelist').doc(userId).get();
    
    if (!doc.exists || doc.data()?.whitelisted !== true) {
      return res.status(403).json({
        error: 'Access denied. Please contact admin for whitelist access.'
      });
    }
    
    // 檢查配額
    const quotaOk = await checkAndIncrementQuota(userId);
    if (!quotaOk) {
      return res.status(429).json({
        error: 'Daily quota exceeded. Please try again tomorrow.'
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Whitelist check failed' });
  }
};

async function checkAndIncrementQuota(userId: string): Promise<boolean> {
  const docRef = firestore.collection('whitelist').doc(userId);
  const doc = await docRef.get();
  const data = doc.data();
  
  if (!data) return false;
  
  const { dailyRequests, usedToday } = data.quotas;
  
  if (usedToday >= dailyRequests) {
    return false;
  }
  
  // 增加使用次數
  await docRef.update({
    'quotas.usedToday': admin.firestore.FieldValue.increment(1)
  });
  
  return true;
}
```

### 6.4 更新 API Route

```typescript
// backend/src/routes/council.ts

import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { whitelistMiddleware } from '../middleware/whitelist';
import { OpenRouterService } from '../services/openrouter';

const router = express.Router();

router.post(
  '/query/stream',
  authMiddleware,
  whitelistMiddleware,
  async (req, res) => {
    const { model, messages, visionMode, imageData } = req.body;
    const userId = req.user!.uid;
    
    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // 使用 Server 端統一管理的 API Key
    const apiKey = process.env.OPENROUTER_API_KEY;
    const openRouter = new OpenRouterService(apiKey);
    
    try {
      const stream = await openRouter.queryStream({
        model,
        messages,
        visionMode,
        imageData
      });
      
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }
      
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
      res.end();
    }
  }
);

export default router;
```

---

## 7. React Native Client 整合

### 7.1 API Client 帶 Firebase ID Token

```typescript
// src/services/api/client.ts

import auth from '@react-native-firebase/auth';
import { API_URL } from '../config';

export const apiClient = {
  async queryModelStream(params: {
    model: string;
    messages: Array<{role: string; content: string}>;
    visionMode?: boolean;
    imageData?: string;
  }) {
    // 取得當前使用者的 ID Token
    const user = auth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const idToken = await user.getIdToken();
    
    const response = await fetch(`${API_URL}/council/query/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Access denied. Please contact admin for whitelist.');
      }
      if (response.status === 429) {
        throw new Error('Daily quota exceeded.');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    return this.parseSSEStream(response);
  },
  
  async *parseSSEStream(response: Response): AsyncGenerator<string> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'chunk') {
            yield data.content;
          } else if (data.type === 'error') {
            throw new Error(data.error);
          } else if (data.type === 'done') {
            return;
          }
        }
      }
    }
  }
};
```

---

## 8. 依賴套件

### 8.1 React Native

```json
{
  "dependencies": {
    "@react-native-firebase/app": "^19.0.0",
    "@react-native-firebase/auth": "^19.0.0",
    "@react-native-firebase/firestore": "^19.0.0",
    "@react-native-firebase/storage": "^19.0.0"
  }
}
```

### 8.2 Backend

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "express": "^4.18.0"
  }
}
```

---

## 9. 安全規則

### 9.1 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      // 只有自己可讀寫自己的資料
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Settings
      match /settings/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Conversations
      match /conversations/{convId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        match /contexts/{contextId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
      
      // Tasks
      match /tasks/{taskId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Canvases
      match /canvases/{canvasId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Whitelist (唯讀)
    match /whitelist/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // 只能從 Admin SDK 寫入
    }
  }
}
```

### 9.2 Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 10. 成本估算（更新）

### Firebase Spark Plan（免費）

- **Authentication**：無限制
- **Firestore**：
  - 讀取：50K/日
  - 寫入：20K/日
  - 刪除：20K/日
  - 儲存：1GB
- **Storage**：5GB 儲存、1GB/日下載

**適用場景**：開發測試、小規模使用（< 100 活躍用戶）

### Firebase Blaze Plan（按量計費）

- **Firestore**：
  - 讀取：$0.06/10萬次（超過免費額度後）
  - 寫入：$0.18/10萬次
  - 儲存：$0.18/GB
- **Storage**：
  - 儲存：$0.026/GB
  - 下載：$0.12/GB

**1000 活躍用戶估算**：
- 每用戶 100 讀取/日 = 300 萬讀取/月 → $1.8
- 每用戶 20 寫入/日 = 60 萬寫入/月 → $1.08
- 儲存 10GB → $1.8
- **總計：~$5-8/月**

加上 OpenRouter API 成本（由 Backend 統一支付）。

---

## 11. 管理工具

### 11.1 白名單管理腳本

```typescript
// backend/scripts/manage-whitelist.ts

import { firestore } from '../src/firebase/admin';

async function addToWhitelist(email: string, tier: 'free' | 'pro' | 'enterprise' = 'free') {
  const usersSnapshot = await firestore.collection('users').where('email', '==', email).get();
  
  if (usersSnapshot.empty) {
    console.error('User not found');
    return;
  }
  
  const userId = usersSnapshot.docs[0].id;
  
  const quotas = {
    free: 100,
    pro: 1000,
    enterprise: 10000
  };
  
  await firestore.collection('whitelist').doc(userId).set({
    email,
    uid: userId,
    whitelisted: true,
    tier,
    addedAt: admin.firestore.FieldValue.serverTimestamp(),
    quotas: {
      dailyRequests: quotas[tier],
      usedToday: 0,
      lastReset: admin.firestore.FieldValue.serverTimestamp()
    }
  });
  
  console.log(`User ${email} added to whitelist with tier: ${tier}`);
}

// 使用範例
addToWhitelist('user@example.com', 'pro');
```

---

## 總結

**優勢**：
- 即時同步所有裝置
- 離線支援
- 自動備份
- 可擴展架構
- 白名單控制存取權限
- 配額管理防濫用

**注意事項**：
- 需要網路連線（離線模式有限制）
- 初期免費額度有限
- 需要妥善設計 Firestore 查詢（避免超額讀取）





