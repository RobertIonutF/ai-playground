# 🧪 Example API Requests

Here are some free public APIs you can use to test API Playground:

## 📝 JSONPlaceholder (Fake REST API)

### GET - Fetch a post
```
URL: https://jsonplaceholder.typicode.com/posts/1
Method: GET
```

### GET - Fetch all users
```
URL: https://jsonplaceholder.typicode.com/users
Method: GET
```

### POST - Create a new post
```
URL: https://jsonplaceholder.typicode.com/posts
Method: POST
Headers:
  Content-Type: application/json
Body:
{
  "title": "My First Post",
  "body": "This is the content of my post",
  "userId": 1
}
```

### PUT - Update a post
```
URL: https://jsonplaceholder.typicode.com/posts/1
Method: PUT
Headers:
  Content-Type: application/json
Body:
{
  "id": 1,
  "title": "Updated Title",
  "body": "Updated content",
  "userId": 1
}
```

### DELETE - Delete a post
```
URL: https://jsonplaceholder.typicode.com/posts/1
Method: DELETE
```

## 🐙 GitHub API

### GET - Fetch a user's profile
```
URL: https://api.github.com/users/github
Method: GET
```

### GET - Fetch user's repositories
```
URL: https://api.github.com/users/github/repos
Method: GET
```

### GET - Search repositories
```
URL: https://api.github.com/search/repositories?q=nextjs
Method: GET
```

## 🎲 Random Data APIs

### GET - Random user data
```
URL: https://randomuser.me/api/
Method: GET
```

### GET - Random dog image
```
URL: https://dog.ceo/api/breeds/image/random
Method: GET
```

### GET - Random cat fact
```
URL: https://catfact.ninja/fact
Method: GET
```

## 🌍 REST Countries

### GET - All countries
```
URL: https://restcountries.com/v3.1/all
Method: GET
```

### GET - Country by name
```
URL: https://restcountries.com/v3.1/name/romania
Method: GET
```

## 💱 Exchange Rates

### GET - Latest exchange rates
```
URL: https://api.exchangerate-api.com/v4/latest/USD
Method: GET
```

## 🎨 Lorem Picsum (Random Images)

### GET - Random image
```
URL: https://picsum.photos/200/300
Method: GET
```

## 🔐 Testing Authentication Headers

### Bearer Token Example
```
URL: https://api.example.com/protected
Method: GET
Headers:
  Authorization: Bearer your_token_here
  Content-Type: application/json
```

### API Key Example
```
URL: https://api.example.com/data
Method: GET
Headers:
  X-API-Key: your_api_key_here
```

## 📬 ReqRes (Test REST API)

### GET - List users
```
URL: https://reqres.in/api/users?page=2
Method: GET
```

### POST - Create user
```
URL: https://reqres.in/api/users
Method: POST
Headers:
  Content-Type: application/json
Body:
{
  "name": "John Doe",
  "job": "Developer"
}
```

### POST - Login
```
URL: https://reqres.in/api/login
Method: POST
Headers:
  Content-Type: application/json
Body:
{
  "email": "eve.holt@reqres.in",
  "password": "cityslicka"
}
```

## 🎯 Tips

1. **Start Simple**: Begin with GET requests to understand the interface
2. **Check Headers**: Some APIs require specific headers like `Content-Type`
3. **Save Requests**: Use the "Save" button to keep useful requests in history
4. **Copy as cURL**: Test the cURL export feature to use in terminal
5. **Inspect Response**: Check the Headers tab to see what the server sends back

## 🚫 APIs That Won't Work

Due to security restrictions, the following won't work through the proxy:
- Localhost URLs (http://localhost:*)
- Private network addresses (192.168.*, 10.*, etc.)
- APIs with very strict CORS policies that block proxy requests

## 📚 More Public APIs

For even more APIs to test with, check out:
- [Public APIs List](https://github.com/public-apis/public-apis)
- [JSONPlaceholder](https://jsonplaceholder.typicode.com/)
- [ReqRes](https://reqres.in/)

