import { useState } from 'react';
import Card from './Card';

        const MemberManagement = ({ profiles, onAdd, onDelete, onUpdate }) => {
            const [newName, setNewName] = useState('');
            const [newAge, setNewAge] = useState('');
            const [newGender, setNewGender] = useState('남성');
            const [newGoal, setNewGoal] = useState('');
            const [newNote, setNewNote] = useState(''); 
            
            const [editingMember, setEditingMember] = useState(null);

            const handleSubmit = (e) => {
                e.preventDefault();
                if (newName.trim() === '') return;
                onAdd({ 
                    name: newName.trim(), age: newAge, gender: newGender, goal: newGoal.trim(), note: newNote.trim(), role: 'member', createdAt: Date.now() 
                });
                setNewName(''); setNewAge(''); setNewGender('남성'); setNewGoal(''); setNewNote('');
            };
            
            const handleEditSave = () => {
                if (!editingMember.name.trim()) return;
                onUpdate(editingMember);
                setEditingMember(null);
            };

            const members = profiles.filter(p => p.role === 'member');

            return (
                <div className="space-y-6 fade-in relative">
                    {/* 회원 수정 모달 */}
                    {editingMember && (
                        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl fade-in">
                                <h3 className="text-xl font-bold text-white mb-4"><i className="fa-solid fa-user-pen mr-2 text-primary-500"></i>회원 정보 수정</h3>
                                <div className="space-y-3">
                                    <div><label className="text-xs text-slate-400">이름</label><input type="text" value={editingMember.name} onChange={e=>setEditingMember({...editingMember, name: e.target.value})} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-primary-500" /></div>
                                    <div className="flex gap-3">
                                        <div className="flex-1"><label className="text-xs text-slate-400">나이</label><input type="number" value={editingMember.age || ''} onChange={e=>setEditingMember({...editingMember, age: e.target.value})} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-primary-500" /></div>
                                        <div className="flex-1"><label className="text-xs text-slate-400">성별</label><select value={editingMember.gender || '남성'} onChange={e=>setEditingMember({...editingMember, gender: e.target.value})} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-primary-500"><option>남성</option><option>여성</option><option>비공개</option></select></div>
                                    </div>
                                    <div><label className="text-xs text-slate-400">운동 목적</label><input type="text" value={editingMember.goal || ''} onChange={e=>setEditingMember({...editingMember, goal: e.target.value})} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-primary-500" /></div>
                                    <div><label className="text-xs text-red-400 font-bold">운동기능 특이사항 (병력 등)</label><textarea value={editingMember.note || ''} onChange={e=>setEditingMember({...editingMember, note: e.target.value})} className="w-full bg-black border border-red-500/50 rounded-lg p-2 text-white outline-none focus:border-red-500 h-24 custom-scrollbar"></textarea></div>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button onClick={handleEditSave} className="flex-1 bg-primary-600 hover:bg-primary-500 text-black font-bold py-2.5 rounded-lg transition">변경 저장</button>
                                    <button onClick={() => setEditingMember(null)} className="px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-lg transition">취소</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <Card className="border-l-4 border-l-primary-500 border-t border-b border-r border-slate-800">
                        <h2 className="text-2xl font-bold mb-4 text-white">신규 회원 상세 등록</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="회원 이름 (필수)" className="flex-1 bg-black border border-slate-700 rounded-xl p-3 text-white focus:border-primary-500 outline-none" required />
                                <input type="number" value={newAge} onChange={(e) => setNewAge(e.target.value)} placeholder="나이" className="w-full sm:w-24 bg-black border border-slate-700 rounded-xl p-3 text-white focus:border-primary-500 outline-none" />
                                <select value={newGender} onChange={(e) => setNewGender(e.target.value)} className="w-full sm:w-28 bg-black border border-slate-700 rounded-xl p-3 text-white focus:border-primary-500 outline-none">
                                    <option value="남성">남성</option>
                                    <option value="여성">여성</option>
                                    <option value="비공개">비공개</option>
                                </select>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="운동 목적 (예: 다이어트, 바디프로필)" className="w-full sm:w-1/3 bg-black border border-slate-700 rounded-xl p-3 text-white focus:border-primary-500 outline-none" />
                                <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="운동기능 특이사항 (예: 허리디스크, 어깨 충돌증후군 등)" className="flex-1 bg-black border border-slate-700 rounded-xl p-3 text-white focus:border-primary-500 outline-none" />
                                <button type="submit" className="px-8 bg-primary-600 hover:bg-primary-500 text-black font-bold rounded-xl transition whitespace-nowrap py-3 sm:py-0">등록하기 +</button>
                            </div>
                        </form>
                    </Card>

                    <h3 className="text-xl font-bold mt-8 mb-4 flex items-center"><i className="fa-solid fa-address-book mr-2 text-primary-500"></i>등록된 회원 목록</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {members.length === 0 ? <div className="col-span-full text-center py-8 text-slate-500 bg-slate-800/30 rounded-xl">회원이 없습니다.</div> : 
                            members.map(member => (
                                <Card key={member.id} className="flex justify-between items-start py-4 border border-slate-800">
                                    <div className="flex items-start gap-3 w-full">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-primary-500/30 flex items-center justify-center font-bold text-primary-500 mt-1 flex-shrink-0">{member.name.substring(0, 1)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-white text-lg flex items-center justify-between">
                                                <span className="truncate">{member.name}</span>
                                                <button onClick={() => setEditingMember(member)} className="text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded transition"><i className="fa-solid fa-pen mr-1"></i>수정</button>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">{member.age ? `${member.age}세` : ''} {member.gender} {member.goal ? `| ${member.goal}` : ''}</div>
                                            {member.note && <div className="text-[11px] text-red-400 mt-1 bg-red-500/10 px-2 py-1 rounded-md inline-block"><i className="fa-solid fa-triangle-exclamation mr-1"></i>{member.note}</div>}
                                        </div>
                                        <button onClick={() => { if(window.confirm('정말 삭제하시겠습니까?')) onDelete(member.id); }} className="text-slate-600 hover:text-red-500 p-2 ml-2"><i className="fa-solid fa-trash"></i></button>
                                    </div>
                                </Card>
                            ))
                        }
                    </div>
                </div>
            );
        };


export default MemberManagement;
