// Test file to verify Express types are working
import express, { Request, Response } from 'express';

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Express types are working!' });
});

console.log('Express types loaded successfully');