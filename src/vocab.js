export const MOODS = ["Dark","Tense","Mind-bending","Epic","Reflective","Melancholic","Witty","Light","Romantic","Heartfelt","Uplifting","Stylish","Intense","Opulent","Sharp"];
export const GENRES = ["Thriller","Crime","Mystery","Horror","Comedy","Romance","Drama","Sci-Fi","Action","Adventure","Musical","War","Satire","Fantasy","Family","Biography","Feel-good","Inspiring"];
export const PAIRINGS = [["Horror","Comedy"],["Thriller","Horror"],["Thriller","Comedy"],["Feel-good","Inspiring"],["Crime","Comedy"],["Crime","Thriller"],["Sci-Fi","Thriller"],["Romance","Comedy"],["Romance","Drama"],["Action","Comedy"],["Mystery","Drama"],["Adventure","Comedy"]];
export const GENRE_ROW = {Thriller:"Thrillers",Crime:"Crime",Mystery:"Mysteries",Horror:"Horror",Comedy:"Comedies",Romance:"Romance",Drama:"Dramas","Sci-Fi":"Science fiction",Action:"Action",Adventure:"Adventures",Musical:"Musicals",War:"War",Satire:"Satire",Fantasy:"Fantasy",Family:"For the family",Biography:"True stories","Feel-good":"Feel-good",Inspiring:"Inspiring"};
export const TIMES = [
  {id:"short", label:"Under 2 hours", test:m=>m && m<120},
  {id:"mid", label:"2 to 2½ hours", test:m=>m>=120 && m<=150},
  {id:"long", label:"A long evening", test:m=>m>150}
];
