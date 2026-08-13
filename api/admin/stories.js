import { db } from '../../src/compat.js';
export const access = 'admin';
export const methods = ['GET','POST','PUT','DELETE'];
export default async function(req,res){
 if(req.method==='GET'){const {rows}=await db.query("SELECT * FROM customer_stories ORDER BY created_at DESC");return res.json(rows)}
 if(req.method==='POST'){const b=req.body||{};if(!b.image_url)return res.status(400).json({error:'A story photo is required.'});const {rows}=await db.query("INSERT INTO customer_stories (image_url,customer_name,caption,product_name,active) VALUES ($1,$2,$3,$4,$5) RETURNING *",[b.image_url,b.customer_name||'Alivèra Muse',b.caption||'',b.product_name||'',b.active!==false]);return res.json(rows[0])}
 if(req.method==='PUT'){const b=req.body||{};const {rows}=await db.query("UPDATE customer_stories SET image_url=$1,customer_name=$2,caption=$3,product_name=$4,active=$5 WHERE id=$6 RETURNING *",[b.image_url,b.customer_name||'Alivèra Muse',b.caption||'',b.product_name||'',b.active!==false,b.id]);if(!rows.length)return res.status(404).json({error:'Story not found.'});return res.json(rows[0])}
 if(req.method==='DELETE'){const {rows}=await db.query("DELETE FROM customer_stories WHERE id=$1 RETURNING id",[req.body?.id]);if(!rows.length)return res.status(404).json({error:'Story not found.'});return res.json({ok:true})}
}